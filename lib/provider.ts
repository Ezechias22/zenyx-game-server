import { getEnv } from './env'

type ProviderCallOptions = {
  method?: 'GET' | 'POST'
  path: string
  body?: unknown
}

function envHeaders() {
  const { PUBLIC_TOKEN, OPERATOR_KEY } = getEnv()
  return {
    'content-type': 'application/json',
    'x-public-token': PUBLIC_TOKEN,
    'x-operator-key': OPERATOR_KEY
  }
}

async function providerFetch<T>({ method = 'GET', path, body }: ProviderCallOptions): Promise<T> {
  const { PROVIDER_BASE_URL } = getEnv()
  const base = PROVIDER_BASE_URL.replace(/\/$/, '')

  const res = await fetch(`${base}${path}`, {
    method,
    headers: envHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  })

  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // provider should return JSON
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || json?.error?.message || `Provider error ${res.status}`
    throw new Error(msg)
  }

  return json as T
}

export function providerGetGames() {
  return providerFetch<any>({ path: '/v1/public/games' })
}

export function providerCreateSession(input: {
  gameCode: string
  playerExternalId: string
  currency: string
  clientSeed?: string
}) {
  return providerFetch<any>({
    method: 'POST',
    path: '/v1/public/session',
    body: input
  })
}

// ✅ bet devient optionnel (free spins)
export function providerPlay(input: { sessionId: string; bet?: number }) {
  return providerFetch<any>({
    method: 'POST',
    path: '/v1/public/play',
    body: input
  })
}
