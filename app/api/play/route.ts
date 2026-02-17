import { NextResponse } from 'next/server'
import { providerPlay } from '@/lib/provider'
import { getEnv } from '@/lib/env'
import { normalizePlayResponse } from '@/lib/normalize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PlayPayload = { sessionId: string; bet?: number }

export async function POST(req: Request) {
  const env = getEnv()

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionId = String(body?.sessionId ?? '').trim()
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  // bet OPTIONAL (free spins)
  const betRaw = body?.bet
  const betNum =
    typeof betRaw === 'number'
      ? betRaw
      : typeof betRaw === 'string'
      ? Number.parseFloat(betRaw)
      : undefined

  const payload: PlayPayload = { sessionId }
  if (Number.isFinite(betNum) && (betNum as number) > 0) payload.bet = betNum as number

  try {
    // ✅ handle BOTH possible signatures:
    // providerPlay(env, payload) OR providerPlay(payload)
    const raw =
      (providerPlay as any).length >= 2
        ? await (providerPlay as any)(env, payload)
        : await (providerPlay as any)(payload)

    // ✅ handle BOTH possible signatures:
    // normalizePlayResponse(raw) OR normalizePlayResponse(raw, opts)
    const normalized =
      (normalizePlayResponse as any).length >= 2
        ? (normalizePlayResponse as any)(raw, { env })
        : (normalizePlayResponse as any)(raw)

    return NextResponse.json(normalized, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Provider play failed' },
      { status: 400 }
    )
  }
}
