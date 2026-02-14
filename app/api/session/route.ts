export const runtime = "nodejs"

import { z } from "zod"
import { createProviderSession } from "@/lib/provider"

const schema = z.object({
  gameCode: z.string()
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return Response.json(parsed.error, { status: 400 })
  }

  const session = await createProviderSession(parsed.data.gameCode)

  return Response.json(session)
}
