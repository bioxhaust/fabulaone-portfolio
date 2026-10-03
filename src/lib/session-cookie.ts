/**
 * Customer cabinet session cookie.
 * Shared by the magic-link route and middleware so www and the apex host
 * see the same login.
 */

export const SESSION_COOKIE = 'fabula_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

const FABULA_HOSTS = new Set(['fabulaone.ru', 'www.fabulaone.ru'])

export function requestHostname(hostHeader: string | null): string {
  return hostHeader?.split(':')[0]?.toLowerCase() ?? ''
}

export function sessionCookieOptions(hostHeader: string | null) {
  const host = requestHostname(hostHeader)
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
    ...(FABULA_HOSTS.has(host) ? { domain: '.fabulaone.ru' } : {}),
  }
}
