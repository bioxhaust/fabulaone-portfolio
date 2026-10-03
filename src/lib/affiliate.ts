/**
 * Partner attribution logic.
 *
 * Flow:
 *   1. Visitor lands on site.ru/?ref=partner123
 *   2. We store { refCode, expiresAt } in a cookie (30-day window)
 *   3. At checkout, we read the cookie and attach partner to the order
 *   4. After successful payment, we create a PartnerEarning and update partner totals
 */

import { cookies } from 'next/headers'

const COOKIE_NAME = 'fabula_ref'
const WINDOW_DAYS = Number(process.env.AFFILIATE_WINDOW_DAYS ?? 30)

export interface RefAttribution {
  refCode: string
  expiresAt: number // unix ms
}

/**
 * Call this in middleware or a layout when ?ref= is present in the URL.
 * Sets / refreshes the attribution cookie.
 */
export async function setRefCookie(refCode: string): Promise<void> {
  const jar = await cookies()
  const expiresAt = Date.now() + WINDOW_DAYS * 86400 * 1000
  jar.set(COOKIE_NAME, JSON.stringify({ refCode, expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: WINDOW_DAYS * 86400,
    path: '/',
  })
}

/**
 * Read current attribution from cookie. Returns null if expired or absent.
 */
export async function getRefAttribution(): Promise<RefAttribution | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as RefAttribution
    if (data.expiresAt < Date.now()) return null
    return data
  } catch {
    return null
  }
}

/**
 * Calculate the commission amount for a partner.
 * Numeric columns sometimes come back as strings — coerce before math.
 */
export function calcCommission(orderAmount: number, ratePercent: number): number {
  const amount = Number(orderAmount)
  const rate = Number(ratePercent)
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0
  return Math.round(amount * rate) / 100
}

type PartnerTotals = {
  id: string
  commissionRate: number
  totalEarned?: number | null
  balance?: number | null
  totalOrders?: number | null
  totalSales?: number | null
}

function partnerIdOf(partner: unknown): string | null {
  if (typeof partner === 'string' && partner) return partner
  if (partner && typeof partner === 'object' && 'id' in partner) {
    const id = (partner as { id?: unknown }).id
    if (typeof id === 'string' && id) return id
  }
  return null
}

/**
 * One commission per paid order. Safe to call from both the webhook and the
 * success-page poll: a second call finds the existing row and does nothing.
 */
export async function creditPartnerSale(
  payload: {
    find: (args: any) => Promise<{ docs: any[] }>
    findByID: (args: any) => Promise<any>
    create: (args: any) => Promise<any>
    update: (args: any) => Promise<any>
  },
  args: {
    partner: unknown
    saleAmount: number
    orderId?: string
    personalOrderId?: string
  },
): Promise<void> {
  const partnerId = partnerIdOf(args.partner)
  if (!partnerId) return
  if (!args.orderId && !args.personalOrderId) return

  const where = args.orderId
    ? { order: { equals: args.orderId } }
    : { personalOrder: { equals: args.personalOrderId } }

  const existing = await payload.find({
    collection: 'partner-earnings',
    where,
    limit: 1,
  })
  if (existing.docs.length > 0) return

  const partner = (await payload.findByID({
    collection: 'partners',
    id: partnerId,
  })) as PartnerTotals | null
  if (!partner) return

  const commission = calcCommission(args.saleAmount, partner.commissionRate)

  try {
    await payload.create({
      collection: 'partner-earnings',
      data: {
        partner: partnerId,
        ...(args.orderId ? { order: args.orderId } : {}),
        ...(args.personalOrderId ? { personalOrder: args.personalOrderId } : {}),
        amount: commission,
        rate: Number(partner.commissionRate),
        status: 'earned',
      },
    })
  } catch (err) {
    const again = await payload.find({
      collection: 'partner-earnings',
      where,
      limit: 1,
    })
    if (again.docs.length > 0) return
    throw err
  }

  const sale = Number(args.saleAmount) || 0
  await payload.update({
    collection: 'partners',
    id: partnerId,
    data: {
      totalEarned: Number(partner.totalEarned ?? 0) + commission,
      balance: Number(partner.balance ?? 0) + commission,
      totalOrders: Number(partner.totalOrders ?? 0) + 1,
      totalSales: Number(partner.totalSales ?? 0) + sale,
    },
  })
}
