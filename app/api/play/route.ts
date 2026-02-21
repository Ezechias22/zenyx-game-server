import { NextResponse } from 'next/server'
import { providerPlay } from '@/lib/provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))

    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
    const betRaw = body?.bet
    const buyFreeSpins = Boolean(body?.buyFreeSpins)

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const bet =
      typeof betRaw === 'number'
        ? betRaw
        : typeof betRaw === 'string'
          ? Number.parseFloat(betRaw)
          : 1

    const betSafe = Number.isFinite(bet) && bet > 0 ? bet : 1

    // ✅ proxy provider tel quel, buyFreeSpins inclus
    const spin = await providerPlay({
      sessionId,
      bet: betSafe,
      ...(buyFreeSpins ? { buyFreeSpins: true } : {})
    } as any)

    return NextResponse.json(spin, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Play error' }, { status: 500 })
  }
}