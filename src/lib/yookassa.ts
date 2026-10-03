/**
 * YooKassa payment integration
 * Docs: https://yookassa.ru/developers/api
 *
 * Patterns aligned with the working vpnbot client:
 * - amount check on succeeded payments
 * - description max 128 chars
 * - structured API errors
 * Idempotency + fiscal receipt kept for FABULA (54-FZ / digital goods).
 */

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

export class YooKassaError extends Error {
  statusCode?: number
  raw?: string

  constructor(message: string, statusCode?: number, raw?: string) {
    super(message)
    this.name = 'YooKassaError'
    this.statusCode = statusCode
    this.raw = raw
  }
}

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim()
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim()
  if (!shopId || !secretKey) {
    throw new YooKassaError('YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY не заданы')
  }
  return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64')
}

function formatAmount(amount: number): string {
  return (Math.round(Number(amount) * 100) / 100).toFixed(2)
}

export function amountsMatch(a: number, b: number, tolerance = 0.02): boolean {
  return Math.abs(Number(a) - Number(b)) <= tolerance
}

/** Map YooKassa payment_method.type → our Orders.select values. */
export function mapPaymentMethod(
  type?: string | null,
): 'bank_card' | 'sbp' | 'yoo_money' | 'other' {
  switch (type) {
    case 'bank_card':
    case 'sbp':
    case 'yoo_money':
      return type
    default:
      return 'other'
  }
}

export interface CreatePaymentParams {
  amount: number
  description: string
  orderId: string
  customerEmail: string
  returnUrl: string
  metadata?: Record<string, string>
}

export interface YooKassaPayment {
  id: string
  status: string
  paid: boolean
  amount: { value: string; currency: string }
  confirmation?: { confirmation_url: string; type?: string }
  payment_method?: { type: string }
  metadata?: Record<string, string>
}

async function parseResponse(res: Response): Promise<any> {
  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new YooKassaError(
      `ЮKassa: не JSON (${res.status}): ${text.slice(0, 300)}`,
      res.status,
      text,
    )
  }
  if (!res.ok) {
    const err = data?.description || data?.type || text.slice(0, 300)
    throw new YooKassaError(String(err), res.status, text)
  }
  return data
}

export async function createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
  // Idempotency key = orderId so duplicate checkout retries are safe
  const idempotencyKey = params.orderId
  const value = formatAmount(params.amount)
  const description = params.description.slice(0, 128)

  const body = {
    amount: {
      value,
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: params.returnUrl,
    },
    description,
    receipt: {
      customer: { email: params.customerEmail },
      items: [
        {
          description,
          quantity: '1.00',
          amount: { value, currency: 'RUB' },
          vat_code: 1, // НДС не облагается
          payment_mode: 'full_payment',
          payment_subject: 'service',
        },
      ],
    },
    metadata: {
      order_id: params.orderId,
      ...params.metadata,
    },
    capture: true,
  }

  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  return parseResponse(res)
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const pid = paymentId.trim()
  if (!pid) throw new YooKassaError('пустой payment_id')

  const res = await fetch(`${YOOKASSA_API}/payments/${pid}`, {
    headers: { Authorization: authHeader() },
  })

  return parseResponse(res)
}

/** Like vpnbot: only return amount when status is succeeded. */
export function paymentSucceededAmountRub(payment: YooKassaPayment): number | null {
  if (String(payment.status || '').toLowerCase() !== 'succeeded') return null
  const raw = payment.amount?.value
  if (raw == null) return null
  const n = Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export async function createRefund(paymentId: string, amount: number, orderId: string): Promise<void> {
  const idempotencyKey = `refund-${orderId}`

  const body = {
    payment_id: paymentId,
    amount: { value: formatAmount(amount), currency: 'RUB' },
  }

  const res = await fetch(`${YOOKASSA_API}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  await parseResponse(res)
}

/**
 * Verify webhook by re-fetching the payment (do not trust notification body alone).
 */
export async function verifyWebhookPayment(paymentId: string): Promise<YooKassaPayment> {
  return getPayment(paymentId)
}
