/**
 * GET  /api/auth/magic  — verify token, set session cookie, redirect to cabinet
 * POST /api/auth/magic  — request a new magic link (send by email)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { verifyMagicToken, signMagicToken, signSessionToken, buildMagicLink } from '@/lib/magic-link'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session-cookie'
import { sendMagicLink } from '@/lib/email'
import { z } from 'zod'

function redirectTo(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://fabulaone.ru'
  return NextResponse.redirect(new URL(path, base))
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return redirectTo('/auth/login?error=missing_token')
  }

  let session: { sub: string; email: string }
  try {
    session = await verifyMagicToken(token)
  } catch {
    return redirectTo('/auth/login?error=expired')
  }

  const res = redirectTo('/cabinet')
  const sessionToken = await signSessionToken(session)
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(req.headers.get('host')))
  return res
}

const requestSchema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  let body: { email: string }
  try {
    body = requestSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Неверный email' }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()
  const payload = await getPayload({ config: configPromise })

  const customers = await payload.find({
    collection: 'customers',
    where: { email: { equals: email } },
    limit: 1,
  })

  const customer = customers.docs[0]
  // Always return 200 when unknown — avoid email enumeration
  if (!customer) {
    return NextResponse.json({ ok: true })
  }

  const token = await signMagicToken({ sub: customer.id, email: customer.email })
  const magicUrl = buildMagicLink(token)

  try {
    await sendMagicLink({
      email: customer.email,
      name: customer.name ?? '',
      magicUrl,
    })
  } catch (err) {
    console.error('magic link email failed:', err)
    return NextResponse.json(
      { error: 'Не удалось отправить письмо. Попробуйте позже или напишите в поддержку.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}
