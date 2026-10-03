import { cookies } from 'next/headers'
import Header from '@/components/Header'
import { SESSION_COOKIE } from '@/lib/session-cookie'

export default async function SiteHeader() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return <Header loggedIn={Boolean(token)} />
}
