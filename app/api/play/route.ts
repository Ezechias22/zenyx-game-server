export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { z } from "zod"
import { verifyToken } from "@/lib/auth"
import { playProvider } from "@/lib/provider"
import { processSpin } from "@/lib/wallet"

const schema = z.object({
  sessionId: z.string(),
  gameCode: z.string(),
  bet: z.number().positive()
})

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m?.[1] || null
}

export async function POST(req: Request) {
  const token = getBearerToken(req)
  if (!token) {
    return Response.json({ error: "Missing Authorization Bearer token" }, { status: 401 })
  }

  let payload: any
  try {
    payload = verifyToken(token)
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 })
  }

  const userId = payload?.userId as string | undefined
  if (!userId) {
    return Response.json({ error: "Invalid token payload" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid body", details: parsed.error }, { status: 400 })
  }

  const { sessionId, gameCode, bet } = parsed.data

  // Call provider
  const providerData = await playProvider(sessionId, bet)

  // Robust win extraction
  const win =
    typeof providerData?.win === "number"
      ? providerData.win
      : typeof providerData?.result?.win === "number"
      ? providerData.result.win
      : 0

  // Wallet internal (DB)
  const newBalance = await processSpin(userId, gameCode, bet, win)

  return Response.json({
    sessionId,
    gameCode,
    bet,
    win,
    balance: newBalance,
    provider: providerData
  })
}
