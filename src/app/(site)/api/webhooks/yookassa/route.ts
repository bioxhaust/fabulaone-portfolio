/**
 * POST /api/webhooks/yookassa
 * Receives payment status notifications from YooKassa.
 *
 * Security: we verify by re-fetching the payment via API (not trusting the body alone).
 * Idempotency: skip if order is already in the target status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  amountsMatch,
  mapPaymentMethod,
  paymentSucceededAmountRub,
  verifyWebhookPayment,
} from '@/lib/yookassa'
import { creditPartnerSale } from '@/lib/affiliate'
import { sendPaymentSuccess, sendMagicLink, sendAdminNewOrder } from '@/lib/email'
import { signMagicToken, buildMagicLink } from '@/lib/magic-link'
import { applyVerifiedPersonalPayment } from '@/lib/personal-payment'
import { getSignedDownloadUrl, resolveProductAudioKey } from '@/lib/storage'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const paymentId: string | undefined = body?.object?.id
  const event: string | undefined = body?.event

  if (!paymentId || !event) {
    return NextResponse.json({ error: 'Missing payment id or event' }, { status: 400 })
  }

  // Re-fetch from YooKassa to verify authenticity
  let payment: Awaited<ReturnType<typeof verifyWebhookPayment>>
  try {
    payment = await verifyWebhookPayment(paymentId)
  } catch (err) {
    console.error('YooKassa verify failed:', err)
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  // Find order by YooKassa payment ID
  const orders = await payload.find({
    collection: 'orders',
    where: { yookassaPaymentId: { equals: paymentId } },
    limit: 1,
    depth: 2,
  })

  // Also check personal orders
  const personalOrders = await payload.find({
    collection: 'personal-orders',
    where: { yookassaPaymentId: { equals: paymentId } },
    limit: 1,
    depth: 2,
  })

  const order = orders.docs[0] ?? null
  const personalOrder = personalOrders.docs[0] ?? null

  if (!order && !personalOrder) {
    // Unknown payment — return 200 so YooKassa doesn't retry
    console.warn('Webhook: order not found for payment', paymentId)
    return NextResponse.json({ ok: true })
  }

  // Handle payment.succeeded
  if (event === 'payment.succeeded' && payment.paid) {
    const paidRub = paymentSucceededAmountRub(payment)
    if (paidRub == null) {
      console.error('Webhook: succeeded event but status/amount invalid', paymentId)
      return NextResponse.json({ ok: true })
    }

    if (order) {
      // Idempotency check
      if (order.status === 'paid') return NextResponse.json({ ok: true })

      if (!amountsMatch(paidRub, Number(order.amount))) {
        console.error(
          `Webhook: amount mismatch payment=${paymentId} api=${paidRub} order=${order.amount}`,
        )
        return NextResponse.json({ ok: true })
      }

      const customer = order.customer as any
      const product = order.product as any

      // Update order
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: 'paid',
          yookassaStatus: payment.status,
          paymentMethod: mapPaymentMethod(payment.payment_method?.type),
          paidAt: new Date().toISOString(),
        },
      })

      // Increment promo code usage
      if (order.promoCode) {
        const promoId = typeof order.promoCode === 'string' ? order.promoCode : (order.promoCode as any).id
        const promo = await payload.findByID({ collection: 'promo-codes', id: promoId })
        if (promo) {
          await payload.update({
            collection: 'promo-codes',
            id: promoId,
            data: { usedCount: (promo.usedCount ?? 0) + 1 },
          })
        }
      }

      if (order.partner) {
        await creditPartnerSale(payload, {
          partner: order.partner,
          saleAmount: Number(order.amount),
          orderId: order.id,
        })
      }

      // Generate signed download URL and send email
      const audioKey = await resolveProductAudioKey(product ?? {}, payload)
      if (audioKey && customer?.email) {
        const downloadUrl = await getSignedDownloadUrl(audioKey)

        // Generate magic link for cabinet
        const magicToken = await signMagicToken({ sub: customer.id, email: customer.email })
        const magicUrl = buildMagicLink(magicToken)

        await sendPaymentSuccess({
          email: customer.email,
          name: customer.name ?? '',
          productTitle: product.title,
          downloadUrl,
          orderId: order.orderNumber,
        })

        await sendMagicLink({
          email: customer.email,
          name: customer.name ?? '',
          magicUrl,
        })
      }

      await sendAdminNewOrder({
        orderNumber: order.orderNumber,
        productTitle: product?.title ?? 'Неизвестный продукт',
        customerEmail: customer.email,
        amount: order.amount,
      })
    }

    if (personalOrder) {
      const applied = await applyVerifiedPersonalPayment(payload, personalOrder, payment)
      if (applied === 'amount_mismatch') {
        console.error(
          `Webhook: personal amount mismatch payment=${paymentId} api=${paidRub} order=${personalOrder.amount}`,
        )
      }
    }
  }

  // Handle payment.canceled
  if (event === 'payment.canceled') {
    if (order && order.status === 'pending') {
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { status: 'cancelled', yookassaStatus: payment.status },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
