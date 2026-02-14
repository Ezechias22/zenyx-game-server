import { getEnvSafe } from "@/lib/runtime-env"

function getProviderHeaders() {
  const { PUBLIC_TOKEN, OPERATOR_KEY, missing } = getEnvSafe()
  if (missing.includes("PUBLIC_TOKEN") || missing.includes("OPERATOR_KEY")) {
    throw new Error(`Missing env: ${missing.join(", ")}`)
  }
  return {
    "x-public-token": PUBLIC_TOKEN!,
    "x-operator-key": OPERATOR_KEY!
  }
}

export async function fetchGames() {
  const { PROVIDER_BASE_URL, missing } = getEnvSafe()
  if (missing.includes("PROVIDER_BASE_URL")) throw new Error(`Missing env: ${missing.join(", ")}`)

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/games`, {
    cache: "no-store",
    headers: {
      ...getProviderHeaders()
    }
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return { error: true, status: res.status, body: data }
  }
  return data
}

export async function createProviderSession(params: {
  gameCode: string
  playerExternalId: string
  currency: string
}) {
  const { PROVIDER_BASE_URL, missing } = getEnvSafe()
  if (missing.includes("PROVIDER_BASE_URL")) throw new Error(`Missing env: ${missing.join(", ")}`)

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getProviderHeaders()
    },
    body: JSON.stringify(params)
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return { error: true, status: res.status, body: data }
  }
  return data
}

export async function playProvider(sessionId: string, bet: number) {
  const { PROVIDER_BASE_URL, missing } = getEnvSafe()
  if (missing.includes("PROVIDER_BASE_URL")) throw new Error(`Missing env: ${missing.join(", ")}`)

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getProviderHeaders()
    },
    body: JSON.stringify({ sessionId, bet })
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return { error: true, status: res.status, body: data }
  }
  return data
}
