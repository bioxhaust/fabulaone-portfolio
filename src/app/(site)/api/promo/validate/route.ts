/**
 * GET /api/promo/validate?code=XXX&productId=yyy
 * Public endpoint to check promo code validity and get discount info.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
  const productId = req.nextUrl.searchParams.get('productId')

  if (!code || !productId) {
    return NextResponse.json({ valid: false })
  }

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'promo-codes',
    where: {
      and: [
        { code: { equals: code } },
        { active: { equals: true } },
      ],
    },
    limit: 1,
  })

  const promo = result.docs[0]
  if (!promo) return NextResponse.json({ valid: false })

  const now = new Date()
  if (promo.expiresAt && new Date(promo.expiresAt) < now) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  const usageLimit = promo.usageLimit ?? 0
  const usedCount = promo.usedCount ?? 0
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return NextResponse.json({ valid: false, reason: 'limit_reached' })
  }

  const applicable =
    !promo.applicableProducts?.length ||
    (promo.applicableProducts as any[]).some(
      (p: any) => (typeof p === 'string' ? p : p.id) === productId,
    )

  if (!applicable) {
    return NextResponse.json({ valid: false, reason: 'not_applicable' })
  }

  return NextResponse.json({
    valid: true,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
  })
}
