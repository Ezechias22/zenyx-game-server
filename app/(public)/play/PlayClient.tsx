'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SpinPanel from '@/components/SpinPanel'
import SlotGrid, { type ProviderWin, type SymbolMap } from '@/components/SlotGrid'
import ProviderLaunchFrame from '@/components/ProviderLaunchFrame'
import BuyFreeSpinsModal from '@/components/BuyFreeSpinsModal'
import FreeSpinsEndOverlay from '@/components/FreeSpinsEndOverlay'

type Wallet = { playerExternalId: string; currency: string; balance: string }

type Game = {
  id: string
  name: string
  kind: 'SLOT' | 'CRASH' | 'DICE' | string
  assets?: {
    cover?: string
    background?: string
    symbols?: string[]
  }
}

// provider events: sometimes {t, d}, sometimes {type, ...}
type ProviderEvent = {
  t?: string
  type?: string
  d?: Record<string, unknown>
  [k: string]: unknown
}

type ProviderPlayResponse = {
  balance?: Wallet
  result?: {
    grid?: unknown
    win?: unknown
    wins?: unknown
    betCost?: unknown
    freeSpins?: {
      before?: unknown
      after?: unknown
      active?: unknown
      multiplier?: unknown
    }
    events?: unknown
  }
  win?: unknown
  error?: string
}

function parseDecimal(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function parseIntSafe(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function empty5x3(): string[][] {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
}

/**
 * Provider grid = 5 reels × 3 rows => grid[reel][row]
 * Parfois 3×5 => transpose.
 */
function to5x3(raw: unknown): string[][] | null {
  if (!Array.isArray(raw)) return null

  // 5x3
  if (raw.length === 5 && raw.every((c) => Array.isArray(c) && (c as unknown[]).length === 3)) {
    return raw.map((col) => (col as unknown[]).map((x) => String(x ?? '')))
  }

  // 3x5 => transpose vers 5x3
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

function normalizeEvents(raw: unknown): ProviderEvent[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => {
      const anyX = x as ProviderEvent
      const t =
        typeof anyX.t === 'string'
          ? anyX.t
          : typeof anyX.type === 'string'
            ? anyX.type
            : 'UNKNOWN'
      return { ...anyX, t }
    })
}

function normalizeProviderWins(rawWins: unknown): ProviderWin[] {
  if (!Array.isArray(rawWins)) return []
  return rawWins
    .filter((w: unknown) => {
      const ww = w as { positions?: unknown }
      return Array.isArray(ww?.positions)
    })
    .map((w: unknown) => {
      const ww = w as { positions: Array<{ reel?: unknown; row?: unknown }> }
      const positions = (ww.positions ?? [])
        .filter((p) => p && Number.isFinite(Number(p.reel)) && Number.isFinite(Number(p.row)))
        .map((p) => ({ reel: Number(p.reel), row: Number(p.row) }))
      return { positions }
    })
    .filter((w) => w.positions.length >= 2)
}

function useAnimatedNumber(value: number, durationMs = 260) {
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
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (to - from) * eased)
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
 * Build symbolKey -> asset url from catalog.
 * Parse filename ".../symbols/W.png" => "W"
 */
function buildSymbolMapFromGame(game: Game | null, providerBaseUrl: string): SymbolMap {
  const base = providerBaseUrl.replace(/\/$/, '')
  const arr = game?.assets?.symbols ?? []
  if (!Array.isArray(arr)) return {}

  const map: SymbolMap = {}
  for (const item of arr) {
    if (typeof item !== 'string') continue
    const url = item.startsWith('http') ? item : `${base}${item.startsWith('/') ? '' : '/'}${item}`
    const clean = url.split('?')[0]
    const file = clean.substring(clean.lastIndexOf('/') + 1)
    const key = decodeURIComponent(file.replace(/\.(png|jpg|jpeg|webp)$/i, ''))
    if (!key) continue
    map[key] = url
  }

  // helpful aliases
  if (!map.W && map.wild) map.W = map.wild
  if (!map.S && map.scatter) map.S = map.scatter
  if (!map.wild && map.W) map.wild = map.W
  if (!map.scatter && map.S) map.scatter = map.S

  return map
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

  // (UI estimate only)
  const BUY_FS_COST_MUL = 100
  const BUY_FS_SPINS = 10

  const [sessionId, setSessionId] = useState(sessionIdParam)
  const [launchUrl, setLaunchUrl] = useState('')

  const [catalog, setCatalog] = useState<Game[]>([])
  const game = useMemo(() => catalog.find((g) => g.id === gameId) || null, [catalog, gameId])
  const symbolMap = useMemo(() => buildSymbolMapFromGame(game, PROVIDER_BASE_URL), [game, PROVIDER_BASE_URL])

  const [grid, setGrid] = useState<string[][]>(() => empty5x3())
  const [wins, setWins] = useState<ProviderWin[]>([])

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceNumber, setBalanceNumber] = useState(0)
  const [win, setWin] = useState(0)

  const [bet, setBet] = useState(1)
  const [spinning, setSpinning] = useState(false)
  const inFlight = useRef(false)

  const [error, setError] = useState('')
  const [showProvider, setShowProvider] = useState(false)

  // FS (source = provider)
  const [fsActive, setFsActive] = useState(false)
  const [fsAfter, setFsAfter] = useState(0)
  const [fsMultiplier, setFsMultiplier] = useState(1)
  const [betCost, setBetCost] = useState(1)

  // Bonus intro
  const [bonusIntro, setBonusIntro] = useState(false)
  const [bonusText, setBonusText] = useState('')

  // FS END overlay (lottie)
  const [fsEndOpen, setFsEndOpen] = useState(false)
  const [fsEndTotalWin, setFsEndTotalWin] = useState(0)
  const [fsEndGameId, setFsEndGameId] = useState('')

  // Buy Free Spins modal
  const [buyOpen, setBuyOpen] = useState(false)
  const [buyBusy, setBuyBusy] = useState(false)

  // animated numbers
  const animBalance = useAnimatedNumber(balanceNumber, 300)
  const animWin = useAnimatedNumber(win, 220)
  const animFs = useAnimatedNumber(fsAfter, 240)

  // auto-play timer
  const autoTimerRef = useRef<number | null>(null)

  // Load catalog
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/games', { cache: 'no-store' })
        const j: unknown = await r.json()
        if (!r.ok) throw new Error((j as any)?.error || 'catalog error')

        const list: Game[] = Array.isArray(j) ? (j as Game[]) : ((j as any)?.games ?? [])
        if (!alive) return
        setCatalog(list)
      } catch (e: unknown) {
        if (alive) setError((e as any)?.message ?? 'catalog error')
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
      } catch (e: unknown) {
        if (alive) setError((e as any)?.message ?? 'Session error')
      }
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  function showBonus(text: string) {
    setBonusText(text)
    setBonusIntro(true)
    window.setTimeout(() => setBonusIntro(false), 1400)
  }

  async function doSpin(
    trigger: 'manual' | 'auto' = 'manual',
    extra?: { buyFreeSpins?: boolean; idempotencyKey?: string }
  ): Promise<void> {
    if (!sessionId) return
    if (inFlight.current) return

    inFlight.current = true
    setSpinning(true)
    setError('')
    setWin(0)
    setWins([])

    try {
      const betToSend = Math.max(1, Number(bet) || 1)
      const payload: Record<string, unknown> = {
        sessionId,
        bet: betToSend
      }

      if (extra?.buyFreeSpins) payload.buyFreeSpins = true
      if (extra?.idempotencyKey) payload.idempotencyKey = extra.idempotencyKey

      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const raw = (await res.json()) as ProviderPlayResponse
      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      // balance (provider authoritative)
      if (raw?.balance) {
        setWallet(raw.balance)
        setBalanceNumber(parseDecimal(raw.balance.balance))
      }

      // grid
      const g = to5x3(raw?.result?.grid)
      if (g) setGrid(g)

      // wins
      const winList = normalizeProviderWins(raw?.result?.wins)
      setWins(winList)

      // win
      setWin(parseDecimal(raw?.result?.win ?? raw?.win ?? 0))

      // free spins state (provider authoritative)
      const fs = raw?.result?.freeSpins
      const after = parseIntSafe(fs?.after)
      const active = Boolean(fs?.active) || after > 0
      const mult = Math.max(1, parseDecimal(fs?.multiplier ?? 1))
      setFsAfter(after)
      setFsActive(active)
      setFsMultiplier(mult)

      // betCost (0 => FREE SPIN)
      setBetCost(parseDecimal(raw?.result?.betCost ?? 1))

      // events
      const events = normalizeEvents(raw?.result?.events)

      const startEv = events.find((e) => e.t === 'FREE_SPINS_START')
      const trigEv = events.find((e) => e.t === 'SCATTER_TRIGGER')
      const reEv = events.find((e) => e.t === 'FREE_SPINS_RETRIGGER')
      const endEv = events.find((e) => e.t === 'FREE_SPINS_END')

      if (startEv) {
        const total = parseIntSafe((startEv.d as any)?.total) || after
        showBonus(`${total} FREE SPINS`)
      } else if (trigEv) {
        const freeSpins = parseIntSafe((trigEv.d as any)?.freeSpins)
        if (freeSpins > 0) showBonus(`${freeSpins} FREE SPINS`)
      } else if (reEv) {
        const added = parseIntSafe((reEv.d as any)?.added)
        if (added > 0) showBonus(`+${added} FREE SPINS`)
      }

      // FS END overlay + lottie mapping (/assets/<gameId>/lottie/fs_end.json)
      if (endEv) {
        const totalWinStr = String((endEv.d as any)?.totalWin ?? '0')
        const totalWin = parseDecimal(totalWinStr)
        const uiGameId = String((endEv.d as any)?.ui?.gameId ?? gameId ?? '')
        const anim = String((endEv.d as any)?.ui?.animation ?? '')

        // show overlay when provider says FS_END (or fallback)
        if (anim === 'FS_END' || true) {
          setFsEndTotalWin(totalWin)
          setFsEndGameId(uiGameId || gameId)
          setFsEndOpen(true)
        }
        showBonus(`FREE SPINS COMPLETE`)
      }
    } catch (e: unknown) {
      setError((e as any)?.message ?? 'Spin error')
    } finally {
      window.setTimeout(() => {
        setSpinning(false)
        inFlight.current = false
      }, 200)
    }
  }

  // Auto-play during FS
  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }

    if (fsActive && fsAfter > 0 && !spinning && !inFlight.current) {
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
  }, [fsActive, fsAfter, spinning])

  async function confirmBuyFreeSpins() {
    if (!sessionId) return
    if (buyBusy) return
    setBuyBusy(true)
    setBuyOpen(false)

    const key = `buyfs_${sessionId}_${Date.now()}`
    try {
      await doSpin('manual', { buyFreeSpins: true, idempotencyKey: key })
    } finally {
      setBuyBusy(false)
    }
  }

  const headerTitle = game?.name ?? gameId
  const currency = wallet?.currency ?? 'BRL'

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 pb-[140px] md:pb-[120px]">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Header */}
      <div className="mb-3">
        <div className="text-lg font-extrabold">{headerTitle}</div>
        <div className="text-xs text-white/60">
          {currency} • Balance: {(animBalance || 0).toFixed(2)}
          {fsActive ? (
            <span className="ml-2 font-extrabold text-amber-200">
              FREE SPINS: {Math.max(0, Math.round(animFs))} • x{fsMultiplier}
            </span>
          ) : null}
          {betCost === 0 ? <span className="ml-2 text-emerald-200/90">• FREE SPIN</span> : null}
        </div>
      </div>

      {/* Grid + overlays */}
      <div className="relative">
        {/* ✅ PROVIDER VIEW now as overlay (not in header) */}
        <button
          disabled={!launchUrl}
          onClick={() => setShowProvider(true)}
          className="absolute right-3 top-3 z-50 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-extrabold text-white/85 backdrop-blur hover:bg-black/55 disabled:opacity-50"
        >
          PROVIDER VIEW
        </button>

        {fsActive ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
            <div className="rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.35)]">
              FREE SPINS MODE • {fsAfter} LEFT • x{fsMultiplier}
            </div>
          </div>
        ) : null}

        {bonusIntro ? (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-500/25 via-purple-500/15 to-black/40 backdrop-blur-[1px] animate-[fadeInOut_1.4s_ease-in-out_forwards]" />
            <div className="relative z-10 text-center">
              <div className="text-[clamp(22px,4vw,44px)] font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.35)]">
                BONUS
              </div>
              <div className="mt-2 text-[clamp(12px,2.2vw,16px)] font-extrabold text-amber-100/95">
                {bonusText}
              </div>
            </div>
          </div>
        ) : null}

        <SlotGrid
          grid={grid}
          spinning={spinning}
          providerBaseUrl={PROVIDER_BASE_URL}
          gameId={gameId}
          symbolMap={symbolMap}
          wins={wins}
          fsActive={fsActive}
          fsRemaining={fsAfter}
        />
      </div>

      {/* Bottom panel (fixed) */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1100px] px-3 py-3">
          <SpinPanel
            balance={Number.isFinite(animBalance) ? animBalance : balanceNumber}
            win={Number.isFinite(animWin) ? animWin : win}
            bet={bet}
            setBet={(v) => {
              if (fsActive) return
              setBet(v)
            }}
            onSpin={() => doSpin('manual')}
            spinning={spinning || (fsActive && fsAfter > 0)}
            fsLocked={fsActive}
            onBuyFreeSpins={() => {
              if (fsActive) return
              setBuyOpen(true)
            }}
          />
          {fsActive ? (
            <div className="mt-2 text-center text-xs font-semibold text-white/70">
              Bet locked during free spins • Provider controls betCost
            </div>
          ) : null}
        </div>
      </div>

      {/* Buy Free Spins */}
      <BuyFreeSpinsModal
        open={buyOpen}
        bet={Math.max(1, Number(bet) || 1)}
        currency={currency}
        buyFsCostMul={BUY_FS_COST_MUL}
        freeSpinsCount={BUY_FS_SPINS}
        busy={buyBusy || spinning}
        onCancel={() => setBuyOpen(false)}
        onConfirm={confirmBuyFreeSpins}
      />

      {/* Free Spins End overlay (Lottie) */}
      <FreeSpinsEndOverlay
        open={fsEndOpen}
        gameId={fsEndGameId || gameId}
        totalWin={fsEndTotalWin}
        currency={currency}
        onClose={() => setFsEndOpen(false)}
      />

      {/* Provider iframe */}
      {showProvider && launchUrl ? (
        <ProviderLaunchFrame launchUrl={launchUrl} onClose={() => setShowProvider(false)} />
      ) : null}

      <style jsx global>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.98); }
          12% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
}