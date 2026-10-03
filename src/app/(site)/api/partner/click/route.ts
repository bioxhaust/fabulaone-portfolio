/**
 * POST /api/partner/click
 * Counts a landing on /?ref=CODE. Called from middleware.
 * Unknown or inactive codes are ignored.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const REF_CODE = /^[a-zA-Z0-9_-]{2,64}$/

export async function POST(req: NextRequest) {
  let ref = ''
  try {
    const body = await req.json()
    ref = typeof body?.ref === 'string' ? body.ref : ''
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!REF_CODE.test(ref)) return NextResponse.json({ ok: true })

  try {
    const payload = await getPayload({ config: configPromise })
    const found = await payload.find({
      collection: 'partners',
      where: {
        and: [{ refCode: { equals: ref } }, { active: { equals: true } }],
      },
      limit: 1,
    })
    const partner = found.docs[0]
    if (!partner) return NextResponse.json({ ok: true })

    await payload.update({
      collection: 'partners',
      id: partner.id,
      data: { totalClicks: Number(partner.totalClicks ?? 0) + 1 },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('partner click error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
