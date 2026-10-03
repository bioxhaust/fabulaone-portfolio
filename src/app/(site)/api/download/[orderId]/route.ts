/**
 * GET /api/download/[orderId]
 * Returns a short-lived signed URL for the purchased audio file.
 * Verifies the request via magic link session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { verifyMagicToken } from '@/lib/magic-link'
import { getSignedDownloadUrl, resolveProductAudioKey } from '@/lib/storage'
import { cookies } from 'next/headers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params
  const token = (await cookies()).get('fabula_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  let session: { sub: string; email: string }
  try {
    session = await verifyMagicToken(token)
  } catch {
    return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })

  const order = await payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 2,
  })

  if (!order || order.status !== 'paid') {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  }

  const customer = order.customer as any
  if (customer?.id !== session.sub && customer?.email !== session.email) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const product = order.product as any
  const audioKey = await resolveProductAudioKey(product ?? {}, payload)
  if (!audioKey) {
    return NextResponse.json({ error: 'Файл недоступен' }, { status: 404 })
  }

  const url = await getSignedDownloadUrl(audioKey)
  return NextResponse.json({ url })
}
