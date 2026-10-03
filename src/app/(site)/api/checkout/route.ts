/**
 * POST /api/checkout
 * Creates an order and initiates a YooKassa payment.
 * One product per order (no cart — agreed in MVP scope).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createPayment } from '@/lib/yookassa'
import { getRefAttribution } from '@/lib/affiliate'
import { buildConsentEntries, customerConsentData, requestIp, requestUserAgent } from '@/lib/consents'
import { z } from 'zod'

const schema = z.object({
  productId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  promoCode: z.string().optional(),
  offerAccepted: z.boolean(),
  pdAccepted: z.boolean(),
  marketingAccepted: z.boolean(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (!data.offerAccepted || !data.pdAccepted) {
      return NextResponse.json({ error: 'Необходимо принять оферту и согласие на обработку ПД' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // Load product
    const product = await payload.findByID({ collection: 'products', id: data.productId })
    if (!product || !product.active) {
      return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })
    }

    let finalAmount = product.price as number
    let promoCodeDoc: any = null

    // Validate promo code
    if (data.promoCode) {
      const promos = await payload.find({
        collection: 'promo-codes',
        where: {
          and: [
            { code: { equals: data.promoCode.toUpperCase() } },
            { active: { equals: true } },
          ],
        },
        limit: 1,
      })
      promoCodeDoc = promos.docs[0]

      if (promoCodeDoc) {
        const now = new Date()
        const expired = promoCodeDoc.expiresAt && new Date(promoCodeDoc.expiresAt) < now
        const limitReached = promoCodeDoc.usageLimit > 0 && promoCodeDoc.usedCount >= promoCodeDoc.usageLimit
        const applicable =
          !promoCodeDoc.applicableProducts?.length ||
          promoCodeDoc.applicableProducts.some((p: any) => (typeof p === 'string' ? p : p.id) === data.productId)

        if (expired || limitReached || !applicable) {
          promoCodeDoc = null
        } else {
          if (promoCodeDoc.discountType === 'percent') {
            finalAmount = Math.max(1, product.price - Math.round((product.price * promoCodeDoc.discountValue) / 100))
          } else {
            finalAmount = Math.max(1, product.price - promoCodeDoc.discountValue)
          }
        }
      }
    }

    // Find or create customer
    const consentedAt = new Date().toISOString()
    const clientIp = requestIp(req.headers)
    const marketingAccepted = data.marketingAccepted === true
    const consentPatch = customerConsentData({
      marketingAccepted,
      at: consentedAt,
      ip: clientIp,
    })
    let customer: any
    const existing = await payload.find({
      collection: 'customers',
      where: { email: { equals: data.email } },
      limit: 1,
    })

    if (existing.docs[0]) {
      customer = await payload.update({
        collection: 'customers',
        id: existing.docs[0].id,
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...consentPatch,
        },
      })
    } else {
      customer = await payload.create({
        collection: 'customers',
        data: {
          email: data.email,
          ...(data.name ? { name: data.name } : {}),
          ...consentPatch,
          ...(marketingAccepted ? {} : { marketingConsent: false }),
        },
      })
    }

    // Affiliate attribution
    const attribution = await getRefAttribution()
    let partner: any = null

    if (attribution?.refCode || promoCodeDoc?.partner) {
      const refCode = attribution?.refCode ?? null
      const partnerFromPromo = promoCodeDoc?.partner

      let partnerQuery: any
      if (partnerFromPromo) {
        partnerQuery = await payload.findByID({ collection: 'partners', id: typeof partnerFromPromo === 'string' ? partnerFromPromo : partnerFromPromo.id })
      } else if (refCode) {
        const res = await payload.find({ collection: 'partners', where: { and: [{ refCode: { equals: refCode } }, { active: { equals: true } }] }, limit: 1 })
        partnerQuery = res.docs[0]
      }
      partner = partnerQuery ?? null
    }

    // Generate order number
    const orderNumber = `FO-${Date.now()}`

    // Create pending order
    const order = await payload.create({
      collection: 'orders',
      data: {
        orderNumber,
        customer: customer.id,
        product: product.id,
        amount: finalAmount,
        originalAmount: product.price,
        status: 'pending',
        partner: partner?.id ?? undefined,
        promoCode: promoCodeDoc?.id ?? undefined,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmContent: data.utmContent,
        utmTerm: data.utmTerm,
        refCode: attribution?.refCode ?? null,
        offerAccepted: data.offerAccepted,
        offerAcceptedAt: consentedAt,
        consentIp: clientIp,
        consentJournal: buildConsentEntries({
          marketingAccepted,
          form: 'catalog-checkout',
          page: '/checkout',
          orderNumber,
          at: consentedAt,
          ip: clientIp,
          userAgent: requestUserAgent(req.headers),
        }),
      },
    })

    // Create YooKassa payment (idempotency key = order.id)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const payment = await createPayment({
      amount: finalAmount,
      description: `FABULA ONE — ${product.title}`,
      orderId: order.id,
      customerEmail: data.email,
      returnUrl: `${siteUrl}/success?order=${order.id}`,
      metadata: {
        order_id: order.id,
        product_id: product.id,
        customer_id: customer.id,
      },
    })

    // Save payment ID
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        yookassaPaymentId: payment.id,
        yookassaStatus: payment.status,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
    })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Неверные данные', details: err.errors }, { status: 400 })
    }
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
