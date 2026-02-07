import { NextResponse } from 'next/server'
import { getProviderEnv } from '../../../lib/runtime-env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY, missing } = getProviderEnv()

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing env: ${missing.join(', ')}` },
      { status: 500 }
    )
  }

  let url: URL
  try {
    url = new URL('/v1/public/games', PROVIDER_BASE_URL)
  } catch {
    return NextResponse.json(
      { error: 'Invalid PROVIDER_BASE_URL' },
      { status: 500 }
    )
  }

  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'x-public-token': PUBLIC_TOKEN,
      'x-operator-key': OPERATOR_KEY,
    },
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

  return NextResponse.json(data ?? { games: [] }, { status: 200 })
}
