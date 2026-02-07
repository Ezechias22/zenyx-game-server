import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProviderEnv } from '../../../lib/runtime-env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  sessionId: z.string().min(1),
  bet: z.number().positive(),
})

export async function POST(req: Request) {
  const { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY, missing } = getProviderEnv()

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing env: ${missing.join(', ')}` },
      { status: 500 }
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  let url: URL
  try {
    url = new URL('/v1/public/play', PROVIDER_BASE_URL)
  } catch {
    return NextResponse.json({ error: 'Invalid PROVIDER_BASE_URL' }, { status: 500 })
  }

  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      'x-public-token': PUBLIC_TOKEN,
      'x-operator-key': OPERATOR_KEY,
    },
    body: JSON.stringify(parsed.data),
  })

  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error || 'Provider error', status: res.status, provider: data },
      { status: res.status }
    )
  }

  return NextResponse.json(data, { status: 200 })
}
