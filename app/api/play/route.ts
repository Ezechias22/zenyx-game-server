import { NextResponse } from 'next/server'
import { providerPlay } from '@/lib/provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
    const bet = Number(body?.bet)

    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    if (!Number.isFinite(bet) || bet <= 0) return NextResponse.json({ error: 'Invalid bet' }, { status: 400 })

    // ✅ return provider raw response as-is (balance is inside result.*)
    const raw = await providerPlay({ sessionId, bet })

    return NextResponse.json(raw, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
