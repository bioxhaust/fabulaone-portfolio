/**
 * GET /api/partner/stats  — partner dashboard data (earnings, clicks, orders)
 * Requires valid fabula_partner_session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { jwtVerify } from 'jose'

function sessionSecret() {
  const key = process.env.MAGIC_LINK_SECRET
  if (!key) throw new Error('MAGIC_LINK_SECRET is not set')
  return new TextEncoder().encode(key)
}

async function getPartnerFromCookie(req: NextRequest) {
  const token = req.cookies.get('fabula_partner_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, sessionSecret())
    return payload as { sub: string; email: string; refCode: string }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const session = await getPartnerFromCookie(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await getPayload({ config: configPromise })

  const partner = await payload.findByID({
    collection: 'partners',
    id: session.sub,
  }) as any

  if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const earningsResult = await payload.find({
    collection: 'partner-earnings',
    where: { partner: { equals: partner.id } },
    sort: '-createdAt',
    limit: 50,
    depth: 1,
  })

  return NextResponse.json({
    name: partner.name,
    email: partner.email,
    refCode: partner.refCode,
    referralLink: partner.referralLink,
    commissionRate: partner.commissionRate,
    balance: partner.balance ?? 0,
    totalEarned: partner.totalEarned ?? 0,
    totalPaid: partner.totalPaid ?? 0,
    totalClicks: partner.totalClicks ?? 0,
    totalOrders: partner.totalOrders ?? 0,
    totalSales: partner.totalSales ?? 0,
    earnings: earningsResult.docs.map((e: any) => {
      const catalog = e.order && typeof e.order === 'object' ? e.order.orderNumber : null
      const personal = e.personalOrder && typeof e.personalOrder === 'object' ? e.personalOrder.orderNumber : null
      return {
        id: e.id,
        amount: e.amount,
        rate: e.rate,
        status: e.status,
        createdAt: e.createdAt,
        orderNumber: catalog || personal || null,
      }
    }),
  })
}
