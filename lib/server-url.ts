import 'server-only'
import { headers } from 'next/headers'

function clean(v: string | null | undefined): string {
  if (!v) return ''
  const s = String(v).trim()
  if (!s) return ''
  const low = s.toLowerCase()
  if (low === 'null' || low === 'undefined') return ''
  return s
}

export function getServerBaseUrl(): string {
  const h = headers()

  const proto = clean(h.get('x-forwarded-proto')) || 'http'
  const xfHost = clean(h.get('x-forwarded-host'))
  const host = clean(xfHost ? xfHost.split(',')[0] : '') || clean(h.get('host'))

  if (host) return `${proto}://${host}`

  const envBase = clean(process.env.APP_BASE_URL)
  if (envBase) return envBase.replace(/\/+$/, '')

  const port = clean(process.env.PORT) || '3000'
  return `http://localhost:${port}`
}
