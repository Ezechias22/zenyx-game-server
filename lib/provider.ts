import { getEnvSafe } from "./runtime-env"

export async function createProviderSession(gameCode: string) {
  const { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY, missing } = getEnvSafe()
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`)

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": PUBLIC_TOKEN!,
      "x-operator-key": OPERATOR_KEY!
    },
    body: JSON.stringify({ gameCode })
  })

  return res.json()
}

export async function playProvider(sessionId: string, bet: number) {
  const { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY, missing } = getEnvSafe()
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`)

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": PUBLIC_TOKEN!,
      "x-operator-key": OPERATOR_KEY!
    },
    body: JSON.stringify({ sessionId, bet })
  })

  return res.json()
}
