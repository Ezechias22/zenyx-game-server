import { NextResponse } from 'next/server'
import { providerGetGames } from '@/lib/provider'
import { normalizeGamesResponse } from '@/lib/normalize'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const raw = await providerGetGames()
    const { PROVIDER_BASE_URL } = getEnv()
    const games = normalizeGamesResponse(raw, PROVIDER_BASE_URL)
    return NextResponse.json({ games }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
