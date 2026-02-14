import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gameCode = req.nextUrl.searchParams.get("gameCode")
  if (!gameCode) {
    return new NextResponse(null, {
      status: 302,
      headers: { Location: "/" }
    })
  }

  const res = await fetch(`${process.env.PROVIDER_BASE_URL}/v1/public/session`, {
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
    return new NextResponse(null, {
      status: 302,
      headers: { Location: "/" }
    })
  }

  const data = await res.json().catch(() => null)
  const sessionId: string | undefined = data?.sessionId

  if (!sessionId) {
    return new NextResponse(null, {
      status: 302,
      headers: { Location: "/" }
    })
  }

  // ✅ Redirect RELATIF => jamais 0.0.0.0
  return new NextResponse(null, {
    status: 302,
    headers: { Location: `/play?sessionId=${encodeURIComponent(sessionId)}` }
  })
}
