import 'server-only'

function clean(v: string | undefined) {
  if (!v) return ''
  const s = String(v).trim()
  const low = s.toLowerCase()
  if (!s || low === 'null' || low === 'undefined') return ''
  return s
}

export function getProviderEnv() {
  const PROVIDER_BASE_URL = clean(process.env.PROVIDER_BASE_URL).replace(/\/+$/, '')
  const PUBLIC_TOKEN = clean(process.env.PUBLIC_TOKEN)
  const OPERATOR_KEY = clean(process.env.OPERATOR_KEY)

  const missing: string[] = []
  if (!PROVIDER_BASE_URL) missing.push('PROVIDER_BASE_URL')
  if (!PUBLIC_TOKEN) missing.push('PUBLIC_TOKEN')
  if (!OPERATOR_KEY) missing.push('OPERATOR_KEY')

  return { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY, missing }
}
