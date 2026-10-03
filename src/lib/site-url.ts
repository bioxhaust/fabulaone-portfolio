/** Public site origin. Safe to import from client components. */
export function publicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://fabulaone.ru'
  return raw.replace(/\/$/, '')
}

export function partnerReferralUrl(refCode: string): string {
  return `${publicSiteOrigin()}/?ref=${encodeURIComponent(refCode)}`
}

/** YooKassa return_url uses personal=1. Older payments used type=personal. */
export function isPersonalReturnFlag(personal?: string | null, type?: string | null): boolean {
  return personal === '1' || type === 'personal'
}

export function questionnairePath(orderId: string, token?: string): string {
  const qs = new URLSearchParams({ order: orderId })
  if (token) qs.set('token', token)
  return `/personal/questionnaire?${qs.toString()}`
}
