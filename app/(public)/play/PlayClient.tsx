'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SpinPanel from '@/components/SpinPanel'
import SlotGrid from '@/components/SlotGrid'
import ProviderLaunchFrame from '@/components/ProviderLaunchFrame'
import type { ProviderWin } from '@/components/PaylineOverlay'

type Wallet = { playerExternalId: string; currency: string; balance: string }

type Game = {
  id: string
  name: string
  kind: 'SLOT' | 'CRASH' | 'DICE' | string
  assets: {
    cover?: string
    background?: string
    symbols?: string[]
  }
}

type ProviderWinRaw = {
  positions?: Array<{ reel?: number; row?: number }>
  amount?: string | number
  lineIndex?: number
}

function parseDecimal(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function empty5x3(): string[][] {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
}

function to5x3(raw: unknown): string[][] | null {
  if (!Array.isArray(raw)) return null

  // 5x3 reel x row
  if (raw.length === 5 && raw.every((c) => Array.isArray(c) && (c as unknown[]).length === 3)) {
    return raw.map((col) => (col as unknown[]).map((x) => String(x ?? ''))) as string[][]
  }

  // 3x5 row x reel -> transpose
  if (raw.length === 3 && raw.every((r) => Array.isArray(r) && (r as unknown[]).length === 5)) {
    const out = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
    for (let row = 0; row < 3; row++) {
      const rowArr = raw[row] as unknown[]
      for (let reel = 0; reel < 5; reel++) {
        out[reel][row] = String(rowArr[reel] ?? '')
      }
    }
    return out
  }

  return null
}

function extractFreeSpinsRemaining(raw: any): number {
  const candidates = [
    raw?.freeSpinsRemaining,
    raw?.result?.freeSpinsRemaining,
    raw?.result?.freeSpins?.remaining,
    raw?.bonus?.freeSpinsRemaining
  ]
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const n = Number.parseInt(v, 10)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

function extractScatters(raw: any): number {
  const candidates = [raw?.result?.scatters, raw?.scatters]
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const n = Number.parseInt(v, 10)
      if (Number.isFinite(n)) return n
    }
    if (Array.isArray(v)) return v.length
  }
  return 0
}

function buildSymbolMap(providerBase: string, symbols?: string[]): Record<string, string> {
  const base = providerBase.replace(/\/$/, '')
  const map: Record<string, string> = {}
  if (!Array.isArray(symbols)) return map

  for (const rel of symbols) {
    const path = String(rel || '')
    if (!path) continue
    const abs = path.startsWith('http') ? path : `${base}${path}`

    const file = path.split('/').pop() || ''
    const key = file.replace(/\.png$/i, '')

    if (key) {
      map[key] = abs
      map[key.toLowerCase()] = abs
      map[key.toUpperCase()] = abs
    }
  }

  return map
}

function normalizeProviderWins(rawWins: unknown): ProviderWin[] {
  if (!Array.isArray(rawWins)) return []

  const winsRaw = rawWins as ProviderWinRaw[]

  const out: ProviderWin[] = winsRaw
    .filter((w: ProviderWinRaw) => Array.isArray(w.positions))
    .map((w: ProviderWinRaw) => {
      const positions =
        (w.positions ?? [])
          .filter((p) => p && Number.isFinite(p.reel) && Number.isFinite(p.row))
          .map((p) => ({ reel: Number(p.reel), row: Number(p.row) })) ?? []

      return { positions }
    })
    .filter((w: ProviderWin) => w.positions.length >= 2)

  return out
}

export default function PlayClient() {
  const router = useRouter()
  const params = useSearchParams()

  const gameId = params.get('gameId') ?? ''
  const sessionIdParam = params.get('sessionId') ?? ''

  const PROVIDER_BASE_URL = useMemo(
    () => process.env.NEXT_PUBLIC_PROVIDER_BASE_URL || 'https://zenyx-games-provider-production.up.railway.app',
    []
  )

  const [sessionId, setSessionId] = useState(sessionIdParam)
  const [launchUrl, setLaunchUrl] = useState('')

  const [catalog, setCatalog] = useState<Game[]>([])
  const game = useMemo(() => catalog.find((g) => g.id === gameId) || null, [catalog, gameId])

  const [symbolMap, setSymbolMap] = useState<Record<string, string>>({})

  const [grid, setGrid] = useState<string[][]>(() => empty5x3())
  const [wins, setWins] = useState<ProviderWin[]>([])
  const [scatters, setScatters] = useState(0)
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0)

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceNumber, setBalanceNumber] = useState(0)
  const [win, setWin] = useState(0)
  const [bet, setBet] = useState(1)

  const [error, setError] = useState('')
  const [spinning, setSpinning] = useState(false)
  const inFlight = useRef(false)

  const [showProvider, setShowProvider] = useState(false)

  // load catalog
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/games', { cache: 'no-store' })
        const j: any = await r.json()
        if (!r.ok) throw new Error(j?.error || 'catalog error')
        if (!alive) return
        const list: Game[] = Array.isArray(j) ? (j as Game[]) : (j?.games ?? [])
        setCatalog(list)
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'catalog error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // build symbolMap
  useEffect(() => {
    if (!game?.assets?.symbols) return
    setSymbolMap(buildSymbolMap(PROVIDER_BASE_URL, game.assets.symbols))
  }, [game?.assets?.symbols, PROVIDER_BASE_URL])

  // ensure session
  useEffect(() => {
    if (!gameId) return

    if (sessionIdParam) {
      setSessionId(sessionIdParam)
      const base = PROVIDER_BASE_URL.replace(/\/$/, '')
      setLaunchUrl(`${base}/v1/launch?s=${encodeURIComponent(sessionIdParam)}`)
      return
    }

    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ gameCode: gameId, playerExternalId: 'player_demo_123', currency: 'BRL' })
        })
        const json: any = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Session error')
        if (!alive) return

        setSessionId(json.sessionId)

        const base = PROVIDER_BASE_URL.replace(/\/$/, '')
        setLaunchUrl(`${base}/v1/launch?s=${encodeURIComponent(json.sessionId)}`)

        const next = new URLSearchParams(params.toString())
        next.set('sessionId', json.sessionId)
        router.replace(`/play?${next.toString()}`)
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Session error')
      }
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  async function doSpin() {
    if (!sessionId) return
    if (inFlight.current) return

    inFlight.current = true
    setSpinning(true)
    setError('')
    setWins([])
    setWin(0)

    try {
      const betToSend = Math.max(1, Number(bet) || 1)

      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, bet: betToSend })
      })

      const raw: any = await res.json()
      console.log('PLAY RAW RESPONSE:', raw)
      console.log('GRID RAW:', raw?.result?.grid)

      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      if (raw?.balance) {
        setWallet(raw.balance as Wallet)
        setBalanceNumber(parseDecimal(raw.balance.balance))
      }

      const g = to5x3(raw?.result?.grid)
      if (g) setGrid(g)

      setWins(normalizeProviderWins(raw?.result?.wins))
      setScatters(extractScatters(raw))
      setFreeSpinsRemaining(extractFreeSpinsRemaining(raw))

      const w = raw?.win ?? raw?.result?.win ?? 0
      setWin(parseDecimal(w))
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      setTimeout(() => {
        setSpinning(false)
        inFlight.current = false
      }, 450)
    }
  }

  return (
    <div className="pb-32">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">{game?.name ?? gameId}</div>
          <div className="text-xs text-white/60">
            {wallet?.currency ?? 'BRL'} • Balance: {wallet?.balance ?? '0'}
            {freeSpinsRemaining > 0 ? (
              <span className="ml-2 font-bold text-amber-200">FREE SPINS: {freeSpinsRemaining}</span>
            ) : null}
            {scatters > 0 ? <span className="ml-2 text-white/60">Scatters: {scatters}</span> : null}
          </div>
        </div>

        <button
          disabled={!launchUrl}
          onClick={() => setShowProvider(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          PROVIDER VIEW
        </button>
      </div>

      <SlotGrid
        grid={grid}
        spinning={spinning}
        symbolMap={symbolMap}
        wins={wins}
        scattersCount={scatters}
        freeSpinsRemaining={freeSpinsRemaining}
        providerBaseUrl={PROVIDER_BASE_URL}
        gameId={gameId}
      />


      <SpinPanel
        balance={balanceNumber}
        win={win}
        bet={bet}
        setBet={setBet}
        onSpin={doSpin}
        spinning={spinning}
      />

      {showProvider && launchUrl ? (
        <ProviderLaunchFrame launchUrl={launchUrl} onClose={() => setShowProvider(false)} />
      ) : null}
    </div>
  )
}
