/**
 * GET/POST /api/personal/questionnaire
 * Saves questionnaire answers for a personal order.
 * Auth: magic token from the payment email, or the cabinet session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { verifyMagicToken } from '@/lib/magic-link'
import { SESSION_COOKIE } from '@/lib/session-cookie'
import { buildStoredAnswers } from '@/lib/questionnaire-answers'
import {
  appendConsentJournal,
  buildConsentEntries,
  customerConsentData,
  requestIp,
  requestUserAgent,
} from '@/lib/consents'
import { z } from 'zod'

const schema = z.object({
  orderId: z.string().min(1),
  token: z.string().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  pdAccepted: z.literal(true),
  marketingAccepted: z.boolean(),
})

async function readIdentity(req: NextRequest, token?: string | null): Promise<{ email: string } | null> {
  const candidates = [token, req.cookies.get(SESSION_COOKIE)?.value].filter(
    (value): value is string => Boolean(value && value.trim()),
  )

  for (const candidate of candidates) {
    try {
      const session = await verifyMagicToken(candidate)
      if (session.email) return { email: session.email }
    } catch {
      /* try the next credential */
    }
  }

  return null
}

async function loadAuthorizedOrder(req: NextRequest, orderId: string, token?: string | null) {
  const session = await readIdentity(req, token)
  if (!session) return { error: NextResponse.json({ error: 'Ссылка недействительна или истекла' }, { status: 401 }) }

  const payload = await getPayload({ config: configPromise })
  let order: any
  try {
    order = await payload.findByID({
      collection: 'personal-orders',
      id: orderId,
      depth: 1,
    })
  } catch {
    return { error: NextResponse.json({ error: 'Заказ не найден' }, { status: 404 }) }
  }

  const customer = order?.customer as { email?: string } | undefined
  if (!customer?.email || customer.email !== session.email) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { payload, order }
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order') ?? ''
  const token = req.nextUrl.searchParams.get('token')
  if (!orderId) {
    return NextResponse.json({ error: 'Неверная ссылка' }, { status: 400 })
  }

  try {
    const loaded = await loadAuthorizedOrder(req, orderId, token)
    if (loaded.error) return loaded.error
    return NextResponse.json({ ok: true, status: loaded.order.status })
  } catch (err) {
    console.error('Questionnaire access error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const loaded = await loadAuthorizedOrder(req, data.orderId, data.token)
    if (loaded.error) return loaded.error

    if (loaded.order.status !== 'paid_questionnaire') {
      return NextResponse.json(
        { error: 'Анкета уже заполнена или заказ в другом статусе' },
        { status: 409 },
      )
    }

    const active = await loaded.payload.find({
      collection: 'questionnaires',
      where: { active: { equals: true } },
      limit: 1,
      sort: '-createdAt',
    })
    const form = active.docs[0]
    if (!form?.fields?.length) {
      return NextResponse.json({ error: 'Анкета не найдена' }, { status: 500 })
    }

    const consentedAt = new Date().toISOString()
    const clientIp = requestIp(req.headers)
    const marketingAccepted = data.marketingAccepted === true
    const customer = loaded.order.customer as { id?: string } | string | undefined
    const customerId = typeof customer === 'string' ? customer : customer?.id

    await loaded.payload.update({
      collection: 'personal-orders',
      id: data.orderId,
      data: {
        questionnaireAnswers: buildStoredAnswers(form.fields, data.answers),
        status: 'questionnaire_done',
        consentJournal: appendConsentJournal(
          loaded.order.consentJournal,
          buildConsentEntries({
            marketingAccepted,
            form: 'personal-questionnaire',
            page: '/personal/questionnaire',
            orderNumber: loaded.order.orderNumber,
            at: consentedAt,
            ip: clientIp,
            userAgent: requestUserAgent(req.headers),
          }),
        ),
      },
    })

    if (customerId) {
      await loaded.payload.update({
        collection: 'customers',
        id: customerId,
        data: customerConsentData({
          marketingAccepted,
          at: consentedAt,
          ip: clientIp,
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Неверные данные', details: err.errors }, { status: 400 })
    }
    console.error('Questionnaire submit error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
