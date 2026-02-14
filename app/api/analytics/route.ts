export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import type { Spin } from "@prisma/client"

export async function GET() {
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
