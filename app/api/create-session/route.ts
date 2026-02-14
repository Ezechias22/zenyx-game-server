import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gameCode = req.nextUrl.searchParams.get("gameCode")

  if (!gameCode) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const res = await fetch(
    `${process.env.PROVIDER_BASE_URL}/v1/public/session`,
    {
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
      })
    }
  )

  if (!res.ok) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const data = await res.json()

  return NextResponse.redirect(
    new URL(`/play?sessionId=${data.sessionId}`, req.url)
  )
}
