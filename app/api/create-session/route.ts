import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function mustEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export async function GET(req: NextRequest) {
  const gameCode = req.nextUrl.searchParams.get("gameCode")
  if (!gameCode) {
    return new NextResponse(null, { status: 302, headers: { Location: "/" } })
  }

  const base = mustEnv("PROVIDER_BASE_URL").replace(/\/+$/, "")

  const res = await fetch(`${base}/v1/public/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": mustEnv("PUBLIC_TOKEN"),
      "x-operator-key": mustEnv("OPERATOR_KEY")
    },
    body: JSON.stringify({
      gameCode,
      playerExternalId: "player_demo_123",
      currency: "BRL"
    }),
    cache: "no-store"
  })

  if (!res.ok) {
    return new NextResponse(null, { status: 302, headers: { Location: "/" } })
  }

  const data = await res.json().catch(() => null)
  const launchUrl: string | undefined = data?.launchUrl

  // ✅ open provider launchUrl as-is (do NOT rebuild)
  if (!launchUrl || typeof launchUrl !== "string") {
    return new NextResponse(null, { status: 302, headers: { Location: "/" } })
  }

  return new NextResponse(null, {
    status: 302,
    headers: { Location: launchUrl }
  })
}
