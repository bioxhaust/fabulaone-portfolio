/**
 * POST /api/checkout/personal
 * Creates a PersonalOrder and initiates a YooKassa payment.
 * Price is fixed (PERSONAL_PRICE env var, default 9900 RUB).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createPayment } from '@/lib/yookassa'
import { getRefAttribution } from '@/lib/affiliate'
import { buildConsentEntries, customerConsentData, requestIp, requestUserAgent } from '@/lib/consents'
import { z } from 'zod'

const PERSONAL_PRICE = parseInt(process.env.PERSONAL_PRICE ?? '9900', 10)

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  offerAccepted: z.literal(true),
  pdAccepted: z.literal(true),
  marketingAccepted: z.boolean(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const payload = await getPayload({ config: configPromise })
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
          name: data.name,
          ...consentPatch,
        },
      })
    } else {
      customer = await payload.create({
        collection: 'customers',
        data: {
          email: data.email,
          name: data.name,
          ...consentPatch,
          ...(marketingAccepted ? {} : { marketingConsent: false }),
        },
      })
    }

    // Affiliate attribution
    const attribution = await getRefAttribution()
    let partner: any = null
    if (attribution?.refCode) {
      const res = await payload.find({
        collection: 'partners',
        where: { and: [{ refCode: { equals: attribution.refCode } }, { active: { equals: true } }] },
        limit: 1,
      })
      partner = res.docs[0] ?? null
    }

    const orderNumber = `FP-${Date.now()}`

    const personalOrder = await payload.create({
      collection: 'personal-orders',
      data: {
        orderNumber,
        customer: customer.id,
        status: 'pending_payment',
        amount: PERSONAL_PRICE,
        partner: partner?.id ?? undefined,
        refCode: attribution?.refCode ?? undefined,
        utmSource: data.utmSource,
        consentIp: clientIp,
        consentJournal: buildConsentEntries({
          marketingAccepted,
          form: 'personal-checkout',
          page: '/personal/checkout',
          orderNumber,
          at: consentedAt,
          ip: clientIp,
          userAgent: requestUserAgent(req.headers),
        }),
      },
    })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const payment = await createPayment({
      amount: PERSONAL_PRICE,
      description: 'FABULA ONE PERSONAL',
      orderId: personalOrder.id,
      customerEmail: data.email,
      returnUrl: `${siteUrl}/success?order=${personalOrder.id}&personal=1`,
      metadata: {
        personal_order_id: personalOrder.id,
        customer_id: customer.id,
      },
    })

    await payload.update({
      collection: 'personal-orders',
      id: personalOrder.id,
      data: { yookassaPaymentId: payment.id },
    })

    return NextResponse.json({
      orderId: personalOrder.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
    })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Неверные данные', details: err.errors }, { status: 400 })
    }
    console.error('Personal checkout error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
