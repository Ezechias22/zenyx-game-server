import { NextResponse } from 'next/server'
import { providerCreateSession } from '@/lib/provider'
import { normalizeSessionResponse } from '@/lib/normalize'
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

  const gameCode = String(body?.gameCode ?? '').trim()
  const playerExternalId = String(body?.playerExternalId ?? '').trim()
  const currency = String(body?.currency ?? '').trim()
  const clientSeed = body?.clientSeed ? String(body.clientSeed).trim() : undefined

  if (!gameCode || !playerExternalId || !currency) {
    return NextResponse.json(
      { error: 'Missing required fields: gameCode, playerExternalId, currency' },
      { status: 400 }
    )
  }

  try {
    const raw = await providerCreateSession({ gameCode, playerExternalId, currency, clientSeed })
    const session = normalizeSessionResponse(raw, env.PROVIDER_BASE_URL)
    return NextResponse.json(session)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to create session' }, { status: 400 })
  }
}
