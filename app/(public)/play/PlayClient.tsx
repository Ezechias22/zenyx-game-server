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

  // provider: 5 reels x 3 rows
  if (raw.length === 5 && raw.every((c) => Array.isArray(c) && (c as unknown[]).length === 3)) {
    return raw.map((col) => (col as unknown[]).map((x) => String(x ?? ''))) as string[][]
  }

  // sometimes comes 3 rows x 5 reels -> transpose
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

function countScattersFromGrid(g: string[][] | null): number {
  if (!g) return 0
  let c = 0
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 3; row++) {
      const k = String(g[reel]?.[row] ?? '').toLowerCase()
      if (k === 's' || k === 'scatter') c++
    }
  }
  return c
}

function normalizeProviderWins(rawWins: unknown): ProviderWin[] {
  if (!Array.isArray(rawWins)) return []
  const winsRaw = rawWins as ProviderWinRaw[]

  return winsRaw
    .filter((w: ProviderWinRaw) => Array.isArray(w.positions))
    .map((w: ProviderWinRaw) => {
      const positions =
        (w.positions ?? [])
          .filter((p) => p && Number.isFinite(p.reel) && Number.isFinite(p.row))
          .map((p) => ({ reel: Number(p.reel), row: Number(p.row) })) ?? []
      return { positions }
    })
    .filter((w: ProviderWin) => w.positions.length >= 2)
}

function useAnimatedNumber(value: number, durationMs = 300) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      const cur = from + (to - from) * eased
      setDisplay(cur)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  return display
}

/**
 * ✅ Support 2 shapes:
 * A) API passthrough raw provider:
 *    { result: { grid, wins, win, freeSpinsRemaining }, balance: {..} }
 * B) API normalized (server normalizePlayResponse):
 *    { grid: SymbolAsset[][], balance:number, win:number, ...maybe freeSpinsRemaining }
 *
 * For UI we always keep a 5x3 string grid (provider orientation).
 */
function extractProviderGrid5x3(raw: any): string[][] | null {
  // raw provider path
  const g1 = to5x3(raw?.result?.grid)
  if (g1) return g1

  // normalized grid: SymbolAsset[][] (3x5 rows/cols) -> convert to 5x3 keys from ids if possible
  const g2 = raw?.grid
  if (Array.isArray(g2) && Array.isArray(g2?.[0]) && g2.length === 3 && g2[0].length === 5) {
    const out = empty5x3()
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = g2[row][col]
        const id = typeof cell?.id === 'string' ? cell.id : ''
        // id often "A_0_0" => take part before first "_"
        const key = id.includes('_') ? id.split('_')[0] : ''
        out[col][row] = key
      }
    }
    return out
  }

  return null
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

  const [sessionId, setSessionId] = useState(sessionIdParam)
  const [launchUrl, setLaunchUrl] = useState('')

  const [catalog, setCatalog] = useState<Game[]>([])
  const game = useMemo(() => catalog.find((g) => g.id === gameId) || null, [catalog, gameId])

  const [grid, setGrid] = useState<string[][]>(() => empty5x3())
  const [wins, setWins] = useState<ProviderWin[]>([])
  const [scatters, setScatters] = useState(0)
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0)

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceNumber, setBalanceNumber] = useState(0)
  const [win, setWin] = useState(0)
  const [bet, setBet] = useState(1)

  const animBalance = useAnimatedNumber(balanceNumber, 350)
  const animWin = useAnimatedNumber(win, 250)
  const animFree = useAnimatedNumber(freeSpinsRemaining, 250)

  const [error, setError] = useState('')
  const [spinning, setSpinning] = useState(false)
  const inFlight = useRef(false)

  const [showProvider, setShowProvider] = useState(false)

  // bonus intro animation
  const [bonusIntro, setBonusIntro] = useState(false)
  const lastFreeRef = useRef(0)

  // autoplay during free spins
  const autoTimerRef = useRef<number | null>(null)

  const inFreeSpins = freeSpinsRemaining > 0

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

  async function doSpin(trigger: 'manual' | 'auto' = 'manual') {
    if (!sessionId || !gameId) return
    if (inFlight.current) return

    inFlight.current = true
    setSpinning(true)
    setError('')
    setWins([])
    setWin(0)

    try {
      const betToSend = Math.max(1, Number(bet) || 1)

      // ✅ IMPORTANT: during free spins, DO NOT send bet
      const payload =
        freeSpinsRemaining > 0
          ? { sessionId, gameId }
          : { sessionId, gameId, bet: betToSend }

      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const raw: any = await res.json()

      console.log('PLAY RAW RESPONSE:', raw)
      console.log('GRID RAW:', raw?.result?.grid ?? raw?.grid)

      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      // wallet/balance: support both shapes
      if (raw?.balance && typeof raw.balance === 'object') {
        setWallet(raw.balance as Wallet)
        setBalanceNumber(parseDecimal(raw.balance.balance))
      } else if (raw?.wallet && typeof raw.wallet === 'object') {
        setWallet(raw.wallet as Wallet)
        setBalanceNumber(parseDecimal(raw.wallet.balance))
      } else if (raw?.balance != null) {
        setBalanceNumber(parseDecimal(raw.balance))
      }

      // grid
      const g = extractProviderGrid5x3(raw)
      if (g) {
        setGrid(g)
        const sc = countScattersFromGrid(g)
        setScatters(sc)
        console.log('SCATTER COUNT (normalized):', sc)
      } else {
        // keep last grid (avoid black screen)
        setScatters(0)
      }

      // wins (for payline highlight)
      const winsRaw = raw?.result?.wins ?? raw?.wins ?? []
      setWins(normalizeProviderWins(winsRaw))

      // win
      setWin(parseDecimal(raw?.win ?? raw?.result?.win ?? 0))

      // free spins remaining (robust paths)
      const fsRaw =
        raw?.freeSpinsRemaining ??
        raw?.result?.freeSpinsRemaining ??
        raw?.result?.freeSpins?.remaining ??
        0

      const fs =
        typeof fsRaw === 'string' ? Number.parseInt(fsRaw, 10) : Number(fsRaw)
      const fsSafe = Number.isFinite(fs) ? fs : 0

      // bonus intro when entering free spins
      if (lastFreeRef.current === 0 && fsSafe > 0) {
        setBonusIntro(true)
        window.setTimeout(() => setBonusIntro(false), 1400)
      }
      lastFreeRef.current = fsSafe
      setFreeSpinsRemaining(fsSafe)
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      window.setTimeout(() => {
        setSpinning(false)
        inFlight.current = false
      }, 220)
    }
  }

  // 🎰 AUTO-PLAY during free spins (runs until 0)
  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }

    if (freeSpinsRemaining > 0 && !spinning && !inFlight.current) {
      autoTimerRef.current = window.setTimeout(() => {
        doSpin('auto')
      }, 520)
    }

    return () => {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current)
        autoTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeSpinsRemaining, spinning])

  const headerTitle = game?.name ?? gameId

  return (
    <div className="pb-36">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">{headerTitle}</div>
          <div className="text-xs text-white/60">
            {wallet?.currency ?? 'BRL'} • Balance:{' '}
            {(Number.isFinite(animBalance) ? animBalance : balanceNumber).toFixed(2)}
            {inFreeSpins ? (
              <span className="ml-2 font-extrabold text-amber-200">
                FREE SPINS: {Math.max(0, Math.round(animFree))}
              </span>
            ) : null}
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

      {/* GRID WRAPPER WITH OVERLAYS */}
      <div className="relative">
        {/* 🟣 FREE SPINS MODE overlay badge */}
        {inFreeSpins ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
            <div className="rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.35)]">
              FREE SPINS MODE • {freeSpinsRemaining} LEFT
            </div>
          </div>
        ) : null}

        {/* ✨ BONUS INTRO animation */}
        {bonusIntro ? (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-500/25 via-purple-500/15 to-black/40 backdrop-blur-[1px] animate-[fadeInOut_1.4s_ease-in-out_forwards]" />
            <div className="relative z-10 text-center">
              <div className="text-[clamp(22px,4vw,42px)] font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.35)]">
                BONUS TRIGGERED
              </div>
              <div className="mt-2 text-[clamp(12px,2.2vw,16px)] font-bold text-amber-100/90">
                FREE SPINS ACTIVATED
              </div>
            </div>
          </div>
        ) : null}

        <SlotGrid
          grid={grid}
          spinning={spinning}
          symbolMap={{}}
          wins={wins}
          scattersCount={scatters}
          freeSpinsRemaining={freeSpinsRemaining}
          providerBaseUrl={PROVIDER_BASE_URL}
          gameId={gameId}
        />
      </div>

      <SpinPanel
        balance={Number.isFinite(animBalance) ? animBalance : balanceNumber}
        win={Number.isFinite(animWin) ? animWin : win}
        bet={bet}
        setBet={setBet}
        onSpin={() => doSpin('manual')}
        // ✅ pendant free spins on peut désactiver manuellement (auto-play)
        spinning={spinning || inFreeSpins}
      />

      {showProvider && launchUrl ? (
        <ProviderLaunchFrame launchUrl={launchUrl} onClose={() => setShowProvider(false)} />
      ) : null}

      <style jsx global>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: scale(0.98);
          }
          12% {
            opacity: 1;
            transform: scale(1);
          }
          70% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  )
}
