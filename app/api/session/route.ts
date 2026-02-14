export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { z } from "zod"
import { createProviderSession } from "@/lib/provider"

const schema = z.object({
  gameCode: z.string(),
  playerExternalId: z.string().min(1).default("player_demo_123"),
  currency: z.string().min(2).default("BRL")
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: "Invalid body", details: parsed.error }, { status: 400 })
  }

  const session = await createProviderSession(parsed.data)

  if ((session as any)?.error) {
    return Response.json((session as any).body ?? { error: "Provider error" }, { status: (session as any).status || 502 })
  }

  return Response.json(session)
}
