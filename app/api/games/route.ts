export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { getEnvSafe } from "@/lib/runtime-env"

export async function GET() {
  const { PROVIDER_BASE_URL, missing } = getEnvSafe()
  if (missing.length) {
    return Response.json({ error: "Missing env", missing }, { status: 500 })
  }

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/games`, {
    cache: "no-store"
  })

  const data = await res.json().catch(() => null)
  return Response.json(data ?? { error: "Invalid provider response" }, { status: res.status })
}
