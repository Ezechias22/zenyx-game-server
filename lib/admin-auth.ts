import 'server-only'
import { cookies, headers } from 'next/headers'
import { readEnv } from './safe-env'

const COOKIE = 'zenyx_admin'

export function isAdminAuthed(): boolean {
  const env = readEnv()
  const expected = env.ADMIN_TOKEN
  if (!expected) return false

  const h = headers()
  const bearer = h.get('authorization') || ''
  if (bearer.toLowerCase().startsWith('bearer ')) {
    const t = bearer.slice(7).trim()
    if (t && t === expected) return true
  }

  const c = cookies().get(COOKIE)?.value
  return !!c && c === expected
}

export function setAdminCookie(token: string) {
  const secure = process.env.NODE_ENV === 'production'
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/' })
}
