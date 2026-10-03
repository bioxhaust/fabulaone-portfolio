/**
 * Middleware handles:
 *   1. Partner attribution — saves ?ref= to a cookie
 *   2. UTM passthrough — stored client-side via JS, no server work needed
 *   3. Partner cabinet auth — redirects to login if no partner session
 *   4. Customer cabinet auth — redirects to login if no magic link session
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicToken } from '@/lib/magic-link'
import { requestHostname, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session-cookie'

function redirectTo(path: string, req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
  if (base) return NextResponse.redirect(new URL(path, base))
  return NextResponse.redirect(new URL(path, req.url))
}

function clearSession(res: NextResponse, host: string | null) {
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(host), maxAge: 0 })
}

async function sessionIsValid(token: string | undefined) {
  if (!token) return false
  try {
    await verifyMagicToken(token)
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')
  if (requestHostname(host) === 'www.fabulaone.ru') {
    const url = req.nextUrl.clone()
    url.protocol = 'https:'
    url.hostname = 'fabulaone.ru'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  const { pathname, searchParams } = req.nextUrl

  if (pathname === '/pages/privacy' || pathname === '/pages/consent') {
    const url = req.nextUrl.clone()
    url.pathname = pathname === '/pages/privacy' ? '/privacy' : '/consent'
    return NextResponse.redirect(url, 308)
  }
  const res = NextResponse.next()

  const ref = searchParams.get('ref')
  if (ref && /^[a-zA-Z0-9_-]{2,64}$/.test(ref)) {
    const windowDays = Number(process.env.AFFILIATE_WINDOW_DAYS ?? 30)
    res.cookies.set('fabula_ref', JSON.stringify({ refCode: ref, expiresAt: Date.now() + windowDays * 86400 * 1000 }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: windowDays * 86400,
      path: '/',
    })
    try {
      // req.url is the public address. From inside the app container that
      // request does not reach this process, so the click was never counted.
      const port = process.env.PORT || '3000'
      await fetch(`http://127.0.0.1:${port}/api/partner/click`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ref }),
        signal: AbortSignal.timeout(2000),
      })
    } catch (err) {
      console.error('partner click count failed', err)
    }
  }

  if (pathname.startsWith('/cabinet') || pathname.startsWith('/auth/login')) {
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value
    const loggedIn = await sessionIsValid(sessionToken)

    // Drop a dead cookie so login does not loop.
    if (pathname.startsWith('/cabinet') && !loggedIn) {
      const denied = redirectTo('/auth/login?next=' + encodeURIComponent(pathname), req)
      if (sessionToken) clearSession(denied, host)
      return denied
    }

    // Already signed in — don't show the magic-link form again.
    if (pathname.startsWith('/auth/login') && loggedIn) {
      const next = searchParams.get('next')
      const dest = next?.startsWith('/cabinet') ? next : '/cabinet'
      return redirectTo(dest, req)
    }
  }

  // Protect partner cabinet
  if (pathname.startsWith('/partner/cabinet')) {
    const partnerSession = req.cookies.get('fabula_partner_session')?.value
    if (!partnerSession) {
      return redirectTo('/partner/login?next=' + encodeURIComponent(pathname), req)
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|media|admin).*)',
  ],
}
