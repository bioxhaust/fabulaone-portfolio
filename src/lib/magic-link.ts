/**
 * Magic link (passwordless) tokens for customer access.
 * Uses HS256 JWT signed with MAGIC_LINK_SECRET.
 */

import { SignJWT, jwtVerify } from 'jose'

const secret = () => {
  const key = process.env.MAGIC_LINK_SECRET
  if (!key) throw new Error('MAGIC_LINK_SECRET is not set')
  return new TextEncoder().encode(key)
}

const MAGIC_LINK_TTL = '24h'
const SESSION_TTL = '30d'

export interface MagicLinkPayload {
  sub: string  // customer id (Payload doc id)
  email: string
}

export async function signMagicToken(payload: MagicLinkPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(MAGIC_LINK_TTL)
    .sign(secret())
}

export async function signSessionToken(payload: MagicLinkPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret())
}

export async function verifyMagicToken(token: string): Promise<MagicLinkPayload> {
  const { payload } = await jwtVerify(token, secret())
  return payload as unknown as MagicLinkPayload
}

export function buildMagicLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return `${base}/auth/magic?token=${encodeURIComponent(token)}`
}
