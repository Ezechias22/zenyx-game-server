import { NextResponse } from 'next/server'
import { providerCreateSession } from '@/lib/provider'
import { normalizeSessionResponse } from '@/lib/normalize'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const gameCode = typeof body?.gameCode === 'string' ? body.gameCode.trim() : ''
    const playerExternalId = typeof body?.playerExternalId === 'string' ? body.playerExternalId.trim() : ''
    const currency = typeof body?.currency === 'string' ? body.currency.trim() : ''
    const clientSeed = typeof body?.clientSeed === 'string' ? body.clientSeed.trim() : undefined

    if (!gameCode) return NextResponse.json({ error: 'Missing gameCode' }, { status: 400 })
    if (!playerExternalId) return NextResponse.json({ error: 'Missing playerExternalId' }, { status: 400 })
    if (!currency) return NextResponse.json({ error: 'Missing currency' }, { status: 400 })

    const raw = await providerCreateSession({ gameCode, playerExternalId, currency, clientSeed })

    const { PROVIDER_BASE_URL } = getEnv()
    const session = normalizeSessionResponse(raw, PROVIDER_BASE_URL)

    return NextResponse.json(session, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
