import { NextResponse } from 'next/server'
import { providerGetGames } from '@/lib/provider'
import { normalizeGamesResponse } from '@/lib/normalize'
import { getEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const env = getEnv()
  try {
    const raw = await providerGetGames()
    const games = normalizeGamesResponse(raw, env.PROVIDER_BASE_URL)
    return NextResponse.json(games)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to fetch games' }, { status: 500 })
  }
}
