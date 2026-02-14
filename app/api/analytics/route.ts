export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { getEnvSafe } from "@/lib/runtime-env"
import type { Spin } from "@prisma/client"

export async function GET() {
  const { missing } = getEnvSafe()
  if (missing.includes("DATABASE_URL")) {
    return Response.json({ error: "Missing env", missing }, { status: 500 })
  }

  const spins: Spin[] = await prisma.spin.findMany()

  const totalBet = spins.reduce((sum: number, s: Spin) => sum + s.bet, 0)
  const totalWin = spins.reduce((sum: number, s: Spin) => sum + s.win, 0)

  return Response.json({
    totalSpins: spins.length,
    totalBet,
    totalWin,
    profit: totalBet - totalWin
  })
}
