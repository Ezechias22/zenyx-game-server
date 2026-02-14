import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gameCode = req.nextUrl.searchParams.get("gameCode")
  if (!gameCode) {
    return new NextResponse(null, { status: 302, headers: { Location: "/" } })
  }

  const base = (process.env.PROVIDER_BASE_URL || "").replace(/\/+$/, "")
  const res = await fetch(`${base}/v1/public/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
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
  const sessionId: string | undefined = data?.sessionId
  const providerLaunchUrl: string | undefined = data?.launchUrl

  if (!sessionId) {
    return new NextResponse(null, { status: 302, headers: { Location: "/" } })
  }

  // ✅ Ne jamais iframer ton propre /play (ça crée une boucle).
  // On ne transmet launchUrl que si c'est une URL externe (provider web UI).
  let externalLaunchUrl = ""
  if (typeof providerLaunchUrl === "string") {
    try {
      const u = new URL(providerLaunchUrl)
      const currentHost = req.headers.get("host") || ""
      if (u.host && u.host !== currentHost) externalLaunchUrl = providerLaunchUrl
    } catch {
      // ignore
    }
  }

  const qs = new URLSearchParams({
    sessionId,
    gameCode
  })
  if (externalLaunchUrl) qs.set("launchUrl", externalLaunchUrl)

  return new NextResponse(null, {
    status: 302,
    headers: { Location: `/play?${qs.toString()}` }
  })
}
