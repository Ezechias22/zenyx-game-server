import { getEnv } from "./runtime-env"

export async function fetchGames() {
  const { PROVIDER_BASE_URL } = getEnv()

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/games`, {
    cache: "no-store"
  })

  return res.json()
}

export async function createProviderSession(gameCode: string) {
  const { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY } = getEnv()

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": PUBLIC_TOKEN,
      "x-operator-key": OPERATOR_KEY
    },
    body: JSON.stringify({ gameCode })
  })

  return res.json()
}

export async function playProvider(sessionId: string, bet: number) {
  const { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY } = getEnv()

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": PUBLIC_TOKEN,
      "x-operator-key": OPERATOR_KEY
    },
    body: JSON.stringify({ sessionId, bet })
  })

  return res.json()
}
