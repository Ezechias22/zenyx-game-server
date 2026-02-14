export const runtime = "nodejs"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/auth"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: "Invalid body", details: parsed.error }, { status: 400 })
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const token = signToken({ userId: user.id })

  return Response.json({
    token,
    user: { id: user.id, email: user.email, balance: user.balance }
  })
}
