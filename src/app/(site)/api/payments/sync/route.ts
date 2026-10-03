/**
 * POST /api/payments/sync
 * Fallback like yookassa_proof poll: if webhook is slow, success page can
 * re-check payment status via API and mark the order paid.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  amountsMatch,
  getPayment,
  mapPaymentMethod,
  paymentSucceededAmountRub,
} from '@/lib/yookassa'
import { creditPartnerSale } from '@/lib/affiliate'
import {
  sendPaymentSuccess,
  sendMagicLink,
  sendAdminNewOrder,
} from '@/lib/email'
import { signMagicToken, buildMagicLink, signSessionToken } from '@/lib/magic-link'
import { getSignedDownloadUrl, resolveProductAudioKey } from '@/lib/storage'
import { PersonalPaymentError, syncPersonalPayment } from '@/lib/personal-payment'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session-cookie'
import { z } from 'zod'

const schema = z.object({
  orderId: z.string().min(1),
  kind: z.enum(['order', 'personal']).default('order'),
})

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json())
    const payload = await getPayload({ config: configPromise })

    if (data.kind === 'order') {
      const order = await payload.findByID({
        collection: 'orders',
        id: data.orderId,
        depth: 2,
      })
      if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      if (order.status === 'paid') return NextResponse.json({ status: 'paid' })
      if (!order.yookassaPaymentId) {
        return NextResponse.json({ status: order.status, reason: 'no_payment' })
      }

      const payment = await getPayment(order.yookassaPaymentId)
      const paidRub = paymentSucceededAmountRub(payment)
      if (paidRub == null || !payment.paid) {
        return NextResponse.json({ status: payment.status })
      }
      if (!amountsMatch(paidRub, Number(order.amount))) {
        return NextResponse.json({ status: 'amount_mismatch' }, { status: 409 })
      }

      const customer = order.customer as any
      const product = order.product as any

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

      if (order.promoCode) {
        const promoId =
          typeof order.promoCode === 'string' ? order.promoCode : (order.promoCode as any).id
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

      const audioKey = await resolveProductAudioKey(product ?? {}, payload)
      if (audioKey && customer?.email) {
        const downloadUrl = await getSignedDownloadUrl(audioKey)
        const magicToken = await signMagicToken({ sub: customer.id, email: customer.email })
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
          magicUrl: buildMagicLink(magicToken),
        })
      }

      await sendAdminNewOrder({
        orderNumber: order.orderNumber,
        productTitle: product?.title ?? 'Неизвестный продукт',
        customerEmail: customer?.email ?? '',
        amount: order.amount,
      })

      return NextResponse.json({ status: 'paid' })
    }

    const result = await syncPersonalPayment(payload, data.orderId)
    const res = NextResponse.json({
      status: result.status,
      ...(result.questionnairePath ? { questionnairePath: result.questionnairePath } : {}),
    })
    if (result.session) {
      const sessionToken = await signSessionToken(result.session)
      res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(req.headers.get('host')))
    }
    return res
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }
    if (err instanceof PersonalPaymentError) {
      if (err.code === 'not_found') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      return NextResponse.json({ status: 'amount_mismatch' }, { status: 409 })
    }
    console.error('payments/sync error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
