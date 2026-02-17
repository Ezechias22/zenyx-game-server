import { NextResponse } from 'next/server'
import { providerGetGames } from '@/lib/provider'
import { getEnv } from '@/lib/env'
import { normalizeGamesResponse } from '@/lib/normalize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const env = getEnv()
    const raw = await providerGetGames()

    // ✅ normalize to stable Game[] array
    const games = normalizeGamesResponse(raw, env.PROVIDER_BASE_URL)

    return NextResponse.json(games, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Failed to load games' },
      { status: 500 }
    )
  }
}
