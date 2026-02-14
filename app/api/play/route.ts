export const runtime = "nodejs"

import { z } from "zod"
import { playProvider } from "@/lib/provider"
import { processSpin } from "@/lib/wallet"

const schema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  gameCode: z.string(),
  bet: z.number()
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return Response.json(parsed.error, { status: 400 })
  }

  const providerData = await playProvider(
    parsed.data.sessionId,
    parsed.data.bet
  )

  const win = providerData.win || 0

  const balance = await processSpin(
    parsed.data.userId,
    parsed.data.gameCode,
    parsed.data.bet,
    win
  )

  return Response.json({
    provider: providerData,
    newBalance: balance
  })
}
