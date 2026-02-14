import { prisma } from "./prisma"
import type { Prisma } from "@prisma/client"

export async function processSpin(
  userId: string,
  gameCode: string,
  bet: number,
  win: number
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error("User not found")
    if (user.balance < bet) throw new Error("Insufficient balance")

    const newBalance = user.balance - bet + win

    await tx.user.update({
      where: { id: userId },
      data: { balance: newBalance }
    })

    await tx.spin.create({
      data: {
        userId,
        gameCode,
        bet,
        win,
        balance: newBalance
      }
    })

    return newBalance
  })
}
