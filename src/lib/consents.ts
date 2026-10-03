/**
 * Версии текстов согласий. Меняются только вместе с текстом на /consent и /ads-consent.
 * Журнал заказа хранит этот идентификатор, чтобы можно было показать, какую редакцию приняли.
 */
export const LEGAL_EDITION_ISO = '2026-09-28'
export const LEGAL_EDITION_LABEL = '28 сентября 2026'

export const PD_CONSENT_VERSION = 'pd-2026-09-28'
export const ADS_CONSENT_VERSION = 'ads-2026-09-28'

export const PRIVACY_PATH = '/privacy'
export const PD_CONSENT_PATH = '/consent'
export const ADS_CONSENT_PATH = '/ads-consent'

export type ConsentKind = 'pd' | 'marketing'

export type ConsentJournalEntry = {
  kind: ConsentKind
  accepted: boolean
  at: string
  version: string
  form: string
  page: string
  orderNumber: string
  ip: string
  userAgent: string
}

const FORM_LABELS: Record<string, string> = {
  'catalog-checkout': 'Оформление заказа',
  'personal-checkout': 'Персональная фабула',
  'personal-questionnaire': 'Анкета персональной фабулы',
}

const KIND_LABELS: Record<ConsentKind, string> = {
  pd: 'Персональные данные',
  marketing: 'Реклама',
}

export function requestIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    ''
  )
}

export function requestUserAgent(headers: Headers): string {
  return (headers.get('user-agent') ?? '').slice(0, 512)
}

export function buildConsentEntries(args: {
  marketingAccepted: boolean
  form: string
  page: string
  orderNumber: string
  at: string
  ip: string
  userAgent: string
}): ConsentJournalEntry[] {
  const base = {
    at: args.at,
    form: args.form,
    page: args.page,
    orderNumber: args.orderNumber,
    ip: args.ip,
    userAgent: args.userAgent,
  }
  return [
    { ...base, kind: 'pd', accepted: true, version: PD_CONSENT_VERSION },
    {
      ...base,
      kind: 'marketing',
      accepted: args.marketingAccepted,
      version: ADS_CONSENT_VERSION,
    },
  ]
}

export function customerConsentData(args: {
  marketingAccepted: boolean
  at: string
  ip: string
}): {
  consentGiven: true
  consentAt: string
  consentIp: string
  consentVersion: string
  marketingConsent?: true
  marketingConsentAt?: string
  marketingConsentVersion?: string
} {
  return {
    consentGiven: true,
    consentAt: args.at,
    consentIp: args.ip,
    consentVersion: PD_CONSENT_VERSION,
    ...(args.marketingAccepted
      ? {
          marketingConsent: true as const,
          marketingConsentAt: args.at,
          marketingConsentVersion: ADS_CONSENT_VERSION,
        }
      : {}),
  }
}

export function readConsentJournal(value: unknown): ConsentJournalEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter(isConsentEntry)
}

export function appendConsentJournal(
  existing: unknown,
  entries: ConsentJournalEntry[],
): ConsentJournalEntry[] {
  return [...readConsentJournal(existing), ...entries]
}

export function formatConsentCopy(entries: ConsentJournalEntry[]): string {
  return entries.map(formatConsentEntry).join('\n\n')
}

function formatConsentEntry(entry: ConsentJournalEntry): string {
  const when = formatConsentTime(entry.at)
  const lines = [
    `${KIND_LABELS[entry.kind]} — ${entry.accepted ? 'флажок установлен' : 'флажок не установлен'}`,
    when,
    `Версия: ${entry.version}`,
    `Форма: ${FORM_LABELS[entry.form] ?? entry.form}`,
    `Страница: ${entry.page}`,
    `Заказ: ${entry.orderNumber}`,
  ]
  if (entry.ip) lines.push(`IP: ${entry.ip}`)
  if (entry.userAgent) lines.push(`User-Agent: ${entry.userAgent}`)
  return lines.join('\n')
}

function formatConsentTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isConsentEntry(value: unknown): value is ConsentJournalEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<ConsentJournalEntry>
  return (
    (entry.kind === 'pd' || entry.kind === 'marketing') &&
    typeof entry.accepted === 'boolean' &&
    typeof entry.at === 'string' &&
    typeof entry.version === 'string'
  )
}
