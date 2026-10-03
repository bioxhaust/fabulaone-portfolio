/**
 * POST /api/partner/auth  — login with email + password
 * DELETE /api/partner/auth — logout
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

function partnerJwtSecret() {
  const key = process.env.MAGIC_LINK_SECRET
  if (!key) throw new Error('MAGIC_LINK_SECRET is not set')
  return new TextEncoder().encode(key)
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = loginSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'partners',
    where: { and: [{ email: { equals: body.email } }, { active: { equals: true } }] },
    limit: 1,
  })

  const partner = result.docs[0] as any
  if (!partner || !partner.passwordHash) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
  }

  const ok = await bcrypt.compare(body.password, partner.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
  }

  const token = await new SignJWT({ sub: partner.id, email: partner.email, refCode: partner.refCode })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(partnerJwtSecret())

  const res = NextResponse.json({ ok: true })
  res.cookies.set('fabula_partner_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('fabula_partner_session')
  return res
}
