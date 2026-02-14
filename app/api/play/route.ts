import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BodySchema = z.object({
  sessionId: z.string().min(10),
  bet: z.number().positive().max(1_000_000)
})

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const base = (process.env.PROVIDER_BASE_URL || "").replace(/\/+$/, "")
  const upstream = await fetch(`${base}/v1/public/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
    },
    body: JSON.stringify(parsed.data),
    cache: "no-store"
  })

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
