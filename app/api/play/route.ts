import { NextResponse } from 'next/server'
import { providerPlay } from '@/lib/provider'
import { normalizePlayResponse } from '@/lib/normalize'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const env = getEnv()

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionId = String(body?.sessionId ?? '').trim()
  const gameId = String(body?.gameId ?? '').trim()

  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  if (!gameId) return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })

  // bet optionnel (free spins => ne pas envoyer)
  const betRaw = body?.bet
  const bet =
    typeof betRaw === 'number'
      ? betRaw
      : typeof betRaw === 'string'
      ? Number.parseFloat(betRaw)
      : undefined

  try {
    const raw =
      typeof bet === 'number' && Number.isFinite(bet) && bet > 0
        ? await providerPlay({ sessionId, bet })
        : await providerPlay({ sessionId }) // ✅ FREE SPINS MODE

    const normalized = normalizePlayResponse(raw, {
      gameId,
      providerBaseUrl: env.PROVIDER_BASE_URL
    })

    return NextResponse.json(normalized)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Spin failed' }, { status: 400 })
  }
}
