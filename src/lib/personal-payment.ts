/**
 * Confirm a PERSONAL payment with YooKassa and move the order to
 * «оплачен, ожидает анкеты». Shared by the webhook, the success-page
 * poll, and the cabinet (so a paid order still appears if the webhook lagged).
 */

import type { Payload } from 'payload'
import {
  amountsMatch,
  getPayment,
  paymentSucceededAmountRub,
  type YooKassaPayment,
} from '@/lib/yookassa'
import { sendAdminNewOrder, sendPersonalAccepted } from '@/lib/email'
import { signMagicToken } from '@/lib/magic-link'
import { creditPartnerSale } from '@/lib/affiliate'
import { publicSiteOrigin, questionnairePath } from '@/lib/site-url'

export class PersonalPaymentError extends Error {
  code: 'not_found' | 'amount_mismatch'

  constructor(code: 'not_found' | 'amount_mismatch') {
    super(code)
    this.name = 'PersonalPaymentError'
    this.code = code
  }
}

type CustomerBrief = { id: string; email: string; name: string }

type PersonalDoc = {
  id: string
  status: string
  amount?: number | null
  orderNumber: string
  customer: unknown
  partner?: unknown
  yookassaPaymentId?: string | null
}

export type PersonalSyncResult = {
  status: string
  questionnairePath?: string
  session?: { sub: string; email: string }
}

function asCustomer(value: unknown): CustomerBrief | null {
  if (!value || typeof value !== 'object') return null
  const c = value as { id?: unknown; email?: unknown; name?: unknown }
  if (typeof c.id !== 'string' || typeof c.email !== 'string') return null
  return {
    id: c.id,
    email: c.email,
    name: typeof c.name === 'string' ? c.name : '',
  }
}

async function loadCustomer(payload: Payload, customer: unknown): Promise<CustomerBrief | null> {
  const populated = asCustomer(customer)
  if (populated) return populated
  if (typeof customer !== 'string' || !customer) return null
  try {
    const doc = await payload.findByID({ collection: 'customers', id: customer })
    return asCustomer(doc)
  } catch {
    return null
  }
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const status = (err as { status?: number }).status
  return status === 404
}

async function notifyPaid(personal: PersonalDoc, customer: CustomerBrief): Promise<string> {
  const token = await signMagicToken({ sub: customer.id, email: customer.email })
  const path = questionnairePath(personal.id, token)
  const questionnaireUrl = `${publicSiteOrigin()}${path}`

  try {
    await sendPersonalAccepted({
      email: customer.email,
      name: customer.name,
      questionnaireUrl,
      orderId: personal.orderNumber,
    })
    await sendAdminNewOrder({
      orderNumber: personal.orderNumber,
      productTitle: 'FABULA ONE PERSONAL',
      customerEmail: customer.email,
      amount: personal.amount ?? 0,
      isPersonal: true,
    })
  } catch (err) {
    console.error('Personal payment emails failed:', personal.id, err)
  }

  return path
}

/** Mark paid and email the questionnaire. Caller has already checked the amount. */
export async function fulfillPersonalOrder(payload: Payload, personal: PersonalDoc): Promise<string | null> {
  const customer = await loadCustomer(payload, personal.customer)

  await payload.update({
    collection: 'personal-orders',
    id: personal.id,
    data: {
      status: 'paid_questionnaire',
      paidAt: new Date().toISOString(),
    },
  })

  if (personal.partner) {
    await creditPartnerSale(payload, {
      partner: personal.partner,
      saleAmount: Number(personal.amount ?? 0),
      personalOrderId: personal.id,
    })
  }

  if (!customer) {
    console.error('Personal order has no customer email', personal.id)
    return null
  }

  return notifyPaid(personal, customer)
}

export async function applyVerifiedPersonalPayment(
  payload: Payload,
  personal: PersonalDoc,
  payment: YooKassaPayment,
): Promise<'fulfilled' | 'amount_mismatch' | 'not_paid' | 'skipped'> {
  if (personal.status !== 'pending_payment') return 'skipped'

  const paidRub = paymentSucceededAmountRub(payment)
  if (paidRub == null || !payment.paid) return 'not_paid'

  const expected = Number(personal.amount ?? 0)
  if (expected > 0 && !amountsMatch(paidRub, expected)) return 'amount_mismatch'

  await fulfillPersonalOrder(payload, personal)
  return 'fulfilled'
}

async function questionnaireRedirect(
  payload: Payload,
  personal: PersonalDoc,
): Promise<PersonalSyncResult> {
  if (personal.status !== 'paid_questionnaire') return { status: personal.status }

  const customer = await loadCustomer(payload, personal.customer)
  if (!customer) return { status: personal.status }

  const token = await signMagicToken({ sub: customer.id, email: customer.email })
  return {
    status: 'paid_questionnaire',
    questionnairePath: questionnairePath(personal.id, token),
    session: { sub: customer.id, email: customer.email },
  }
}

/**
 * Re-check YooKassa when the order is still awaiting payment.
 * When the questionnaire is the next step, also return a path and a session
 * so the success page can open the form and sign the buyer into the cabinet.
 */
export async function syncPersonalPayment(payload: Payload, orderId: string): Promise<PersonalSyncResult> {
  let personal: PersonalDoc
  try {
    personal = (await payload.findByID({
      collection: 'personal-orders',
      id: orderId,
      depth: 1,
    })) as PersonalDoc
  } catch (err) {
    if (isNotFound(err)) throw new PersonalPaymentError('not_found')
    throw err
  }

  if (personal.status === 'pending_payment') {
    if (!personal.yookassaPaymentId) return { status: personal.status }

    const payment = await getPayment(personal.yookassaPaymentId)
    const applied = await applyVerifiedPersonalPayment(payload, personal, payment)
    if (applied === 'amount_mismatch') throw new PersonalPaymentError('amount_mismatch')
    if (applied !== 'fulfilled') return { status: payment.status }

    return questionnaireRedirect(payload, { ...personal, status: 'paid_questionnaire' })
  }

  return questionnaireRedirect(payload, personal)
}
