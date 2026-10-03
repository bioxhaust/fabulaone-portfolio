/**
 * GET /api/personal-download/[orderId]
 * Returns a presigned download URL for a completed personal order.
 * Auth: fabula_session cookie (customer cabinet) OR one-time token query param.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { jwtVerify } from 'jose'
import { getSignedDownloadUrl } from '@/lib/storage'

function sessionSecret() {
  const key = process.env.MAGIC_LINK_SECRET
  if (!key) throw new Error('MAGIC_LINK_SECRET is not set')
  return new TextEncoder().encode(key)
}

async function verifySession(req: NextRequest): Promise<{ email: string } | null> {
  // Try session cookie first
  const sessionToken = req.cookies.get('fabula_session')?.value
  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, sessionSecret())
      return { email: payload.email as string }
    } catch { /* fall through to query param */ }
  }
  // Try one-time token from query string (sent in readiness email)
  const token = req.nextUrl.searchParams.get('token')
  if (token) {
    try {
      const { payload } = await jwtVerify(token, sessionSecret())
      return { email: payload.email as string }
    } catch { /* invalid */ }
  }
  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  const session = await verifySession(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })

  const order = await payload.findByID({
    collection: 'personal-orders',
    id: orderId,
    depth: 1,
  }) as any

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (order.status !== 'ready') {
    return NextResponse.json({ error: 'Заказ ещё не готов' }, { status: 403 })
  }

  const customer = order.customer as any
  if (customer?.email !== session.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!order.audioKey) {
    return NextResponse.json({ error: 'Файл ещё не загружен' }, { status: 404 })
  }

  const downloadUrl = await getSignedDownloadUrl(order.audioKey)
  return NextResponse.redirect(downloadUrl)
}
