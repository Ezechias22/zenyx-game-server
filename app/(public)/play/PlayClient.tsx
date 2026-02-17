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
  kind?: string
  assets?: {
    cover?: string
    background?: string
    symbols?: string[] // provider paths or absolute urls
  }
}

type ProviderEvent = { type: string; [k: string]: unknown }

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

  // provider: 5 reels x 3 rows
  if (raw.length === 5 && raw.every((c) => Array.isArray(c) && (c as unknown[]).length === 3)) {
    return raw.map((col) => (col as unknown[]).map((x: unknown) => String(x ?? '')))
  }

  // sometimes: 3 rows x 5 reels -> transpose
  if (raw.length === 3 && raw.every((r) => Array.isArray(r) && (r as unknown[]).length === 5)) {
    const out = empty5x3()
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

function normalizeWins(rawWins: unknown): ProviderWin[] {
  if (!Array.isArray(rawWins)) return []
  return (rawWins as any[])
    .filter((w) => Array.isArray(w?.positions))
    .map((w) => ({
      positions: (w.positions as any[])
        .filter((p) => Number.isFinite(p?.reel) && Number.isFinite(p?.row))
        .map((p) => ({ reel: Number(p.reel), row: Number(p.row) }))
    }))
    .filter((w) => w.positions.length >= 2)
}

/**
 * Build symbolMap from catalog assets.symbols:
 * input: ["/assets/fruit_classic/symbols/cherry.png", ...]
 * output: { cherry: "https://.../assets/.../cherry.png", ... }
 */
function buildSymbolMap(
  providerBaseUrl: string,
  gameId: string,
  symbols: string[] | undefined
): Record<string, string> {
  const base = providerBaseUrl.replace(/\/$/, '')
  const map: Record<string, string> = {}

  const add = (key: string, url: string) => {
    if (!key) return
    if (!map[key]) map[key] = url
  }

  // from catalog (best source)
  if (Array.isArray(symbols)) {
    for (const s of symbols) {
      if (typeof s !== 'string' || !s.trim()) continue
      const abs = s.startsWith('http') ? s : `${base}${s.startsWith('/') ? '' : '/'}${s}`
      const file = abs.split('/').pop() ?? ''
      const key = file.replace(/\.png$/i, '').replace(/\.jpg$/i, '').replace(/\.jpeg$/i, '')
      add(key, abs)
    }
  }

  // always add fallback for common keys (if catalog missing)
  const fallback = (k: string) => `${base}/assets/${gameId}/symbols/${encodeURIComponent(k)}.png`

  ;['A', 'K', 'Q', 'J', '10', '9', 'W', 'S', 'wild', 'scatter'].forEach((k) => add(k, fallback(k)))

  return map
}

export default function PlayClient() {
  const router = useRouter()
  const params = useSearchParams()

  const gameId = params.get('gameId') ?? ''
  const sessionIdParam = params.get('sessionId') ?? ''

  const PROVIDER_BASE_URL = useMemo(
    () =>
      process.env.NEXT_PUBLIC_PROVIDER_BASE_URL ||
      'https://zenyx-games-provider-production.up.railway.app',
    []
  )

  const [catalog, setCatalog] = useState<Game[]>([])
  const game = useMemo(() => catalog.find((g) => g.id === gameId) ?? null, [catalog, gameId])

  const [sessionId, setSessionId] = useState(sessionIdParam)
  const [launchUrl, setLaunchUrl] = useState('')

  const [grid, setGrid] = useState<string[][]>(() => empty5x3())
  const [wins, setWins] = useState<ProviderWin[]>([])

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceNumber, setBalanceNumber] = useState(0)
  const [win, setWin] = useState(0)
  const [bet, setBet] = useState(1)

  const [error, setError] = useState('')
  const [spinning, setSpinning] = useState(false)
  const inFlight = useRef(false)

  const [showProvider, setShowProvider] = useState(false)

  // FREE SPINS via result.events
  const [inFreeSpins, setInFreeSpins] = useState(false)
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0)
  const inFreeRef = useRef(false)
  const freeRef = useRef(0)

  useEffect(() => {
    inFreeRef.current = inFreeSpins
  }, [inFreeSpins])

  useEffect(() => {
    freeRef.current = freeSpinsRemaining
  }, [freeSpinsRemaining])

  const symbolMap = useMemo(() => {
    return buildSymbolMap(PROVIDER_BASE_URL, gameId, game?.assets?.symbols)
  }, [PROVIDER_BASE_URL, gameId, game?.assets?.symbols])

  // Load catalog (needed for symbolMap)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/games', { cache: 'no-store' })
        const j: any = await r.json()
        if (!r.ok) throw new Error(j?.error || 'catalog error')
        if (!alive) return
        const list: Game[] = Array.isArray(j) ? j : Array.isArray(j?.games) ? j.games : []
        setCatalog(list)
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'catalog error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Ensure session
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
          body: JSON.stringify({
            gameCode: gameId,
            playerExternalId: 'player_demo_123',
            currency: 'BRL'
          })
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

  function applyFreeSpinsFromEvents(events: ProviderEvent[] | undefined) {
    if (!Array.isArray(events)) return

    for (const ev of events) {
      const type = String(ev?.type ?? '')
      if (type === 'FREE_SPINS_START') {
        const total = Number((ev as any).total ?? (ev as any).freeSpins ?? 0)
        if (Number.isFinite(total) && total > 0) {
          setInFreeSpins(true)
          setFreeSpinsRemaining(total)
        }
      }

      if (type === 'FREE_SPINS_RETRIGGER') {
        const remaining = Number((ev as any).remaining ?? 0)
        if (Number.isFinite(remaining) && remaining >= 0) {
          setInFreeSpins(true)
          setFreeSpinsRemaining(remaining)
        }
      }

      if (type === 'FREE_SPINS_END') {
        setInFreeSpins(false)
        setFreeSpinsRemaining(0)
      }
    }
  }

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
      console.log('EVENTS RAW:', raw?.result?.events)

      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      // wallet/balance
      if (raw?.balance?.balance != null) {
        setWallet(raw.balance as Wallet)
        setBalanceNumber(parseDecimal(raw.balance.balance))
      }

      // grid
      const g = to5x3(raw?.result?.grid)
      if (g) setGrid(g)

      // wins
      setWins(normalizeWins(raw?.result?.wins))

      // win
      setWin(parseDecimal(raw?.result?.win ?? 0))

      // free spins from events (the correct way)
      applyFreeSpinsFromEvents(raw?.result?.events)

      // decrement remaining AFTER a FREE SPIN spin happened (client side)
      // If provider does not give remaining each time, we keep UI counter accurate.
      if (inFreeRef.current && freeRef.current > 0) {
        setFreeSpinsRemaining((prev) => Math.max(0, prev - 1))
      }
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      window.setTimeout(() => {
        setSpinning(false)
        inFlight.current = false
      }, 220)
    }
  }

  // Auto-play during free spins
  useEffect(() => {
    if (!inFreeSpins) return
    if (spinning) return
    if (freeSpinsRemaining <= 0) return

    const t = window.setTimeout(() => doSpin(), 650)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFreeSpins, freeSpinsRemaining, spinning])

  return (
    <div className="pb-36">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">{game?.name ?? gameId}</div>
          <div className="text-xs text-white/60">
            {wallet?.currency ?? 'BRL'} • Balance: {balanceNumber.toFixed(2)}
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

      {/* FREE SPINS MODE overlay */}
      {inFreeSpins ? (
        <div className="pointer-events-none mb-3 flex justify-center">
          <div className="rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-100">
            FREE SPINS MODE • {freeSpinsRemaining} LEFT
          </div>
        </div>
      ) : null}

      <SlotGrid
        grid={grid}
        spinning={spinning}
        symbolMap={symbolMap}          // ✅ FIX: required prop
        wins={wins}
        providerBaseUrl={PROVIDER_BASE_URL}
        gameId={gameId}
        freeSpinsRemaining={freeSpinsRemaining}
      />

      <SpinPanel
        balance={balanceNumber}
        win={win}
        bet={bet}
        setBet={setBet}
        onSpin={doSpin}
        spinning={spinning || inFreeSpins}
      />

      {showProvider && launchUrl ? (
        <ProviderLaunchFrame launchUrl={launchUrl} onClose={() => setShowProvider(false)} />
      ) : null}
    </div>
  )
}
