'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SpinPanel from '@/components/SpinPanel'
import SlotGrid, { type ProviderWin, type SymbolMap } from '@/components/SlotGrid'
import ProviderLaunchFrame from '@/components/ProviderLaunchFrame'

type Wallet = { playerExternalId: string; currency: string; balance: string }

type Game = {
  id: string
  name: string
  kind: 'SLOT' | 'CRASH' | 'DICE' | string
  assets?: {
    cover?: string
    background?: string
    symbols?: string[] // provider renvoie les URLs/paths des symboles
  }
}

type ProviderEvent =
  | { type: 'SCATTER_TRIGGER'; scatters?: number; freeSpins?: number }
  | { type: 'FREE_SPINS_START'; total?: number; bet?: number }
  | { type: 'FREE_SPINS_RETRIGGER'; added?: number; remaining?: number }
  | { type: 'FREE_SPINS_END' }
  | { type: string; [k: string]: unknown }

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
 * Parfois ça peut arriver en 3×5, on transpose.
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
    .map((x) => ({
      ...(x as any),
      type: typeof (x as any).type === 'string' ? (x as any).type : 'UNKNOWN'
    }))
}

function normalizeProviderWins(rawWins: unknown): ProviderWin[] {
  if (!Array.isArray(rawWins)) return []
  return rawWins
    .filter((w: any) => Array.isArray(w?.positions))
    .map((w: any) => ({
      positions: (w.positions as any[])
        .filter((p) => p && Number.isFinite(p.reel) && Number.isFinite(p.row))
        .map((p) => ({ reel: Number(p.reel), row: Number(p.row) }))
    }))
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
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
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
 * Construit un mapping symbolKey -> URL asset
 * On parse le filename: ".../symbols/W.png" => "W"
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

  // Bonus alias “souvent” utiles (sans hardcoder le provider)
  // Si le catalog a "wild.png" mais le moteur renvoie "W", on fait un pont si possible.
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

  // Free Spins state (source = provider)
  const [fsActive, setFsActive] = useState(false)
  const [fsAfter, setFsAfter] = useState(0)
  const [fsMultiplier, setFsMultiplier] = useState(1)
  const [betCost, setBetCost] = useState(1)

  // UI effects
  const [bonusIntro, setBonusIntro] = useState(false)
  const [bonusText, setBonusText] = useState<string>('')

  // animated numbers
  const animBalance = useAnimatedNumber(balanceNumber, 300)
  const animWin = useAnimatedNumber(win, 220)
  const animFs = useAnimatedNumber(fsAfter, 240)

  // auto-play timer (free spins)
  const autoTimerRef = useRef<number | null>(null)

  // ✅ Load catalog
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/games', { cache: 'no-store' })
        const j: any = await r.json()
        if (!r.ok) throw new Error(j?.error || 'catalog error')

        const list: Game[] = Array.isArray(j) ? (j as Game[]) : (j?.games ?? [])
        if (!alive) return
        setCatalog(list)
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'catalog error')
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  // ✅ Ensure session
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

  function showBonusIntro(text: string) {
    setBonusText(text)
    setBonusIntro(true)
    window.setTimeout(() => setBonusIntro(false), 1400)
  }

  async function doSpin(trigger: 'manual' | 'auto' = 'manual') {
    if (!sessionId) return
    if (inFlight.current) return

    inFlight.current = true
    setSpinning(true)
    setError('')
    setWin(0)
    setWins([])

    try {
      const betToSend = Math.max(1, Number(bet) || 1)

      // ✅ Toujours envoyer bet normal. Le provider décide si betCost=0 (free spin) ou non.
      const payload = { sessionId, bet: betToSend }

      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const raw = (await res.json()) as ProviderPlayResponse

      console.log('PLAY RAW RESPONSE:', raw)
      console.log('GRID RAW:', raw?.result?.grid)
      console.log('EVENTS RAW:', raw?.result?.events)

      if (!res.ok) throw new Error((raw as any)?.error || 'Spin failed')

      // ✅ Balance (source unique)
      if (raw?.balance) {
        setWallet(raw.balance)
        setBalanceNumber(parseDecimal(raw.balance.balance))
      }

      // ✅ Grid
      const g = to5x3(raw?.result?.grid)
      if (g) setGrid(g)

      // ✅ Wins positions (paylines uniquement sur gains)
      const winList = normalizeProviderWins(raw?.result?.wins)
      setWins(winList)

      // ✅ Win
      setWin(parseDecimal(raw?.result?.win ?? raw?.win ?? 0))

      // ✅ FreeSpins state (source unique = provider)
      const fs = raw?.result?.freeSpins
      const after = parseIntSafe(fs?.after)
      const active = Boolean(fs?.active) || after > 0
      const mult = Math.max(1, parseDecimal(fs?.multiplier ?? 1))

      setFsAfter(after)
      setFsActive(active)
      setFsMultiplier(mult)

      // ✅ betCost = 0 => free spin (pas de debit à animer)
      setBetCost(parseDecimal(raw?.result?.betCost ?? 1))

      // ✅ Events -> trigger UI
      const events = normalizeEvents(raw?.result?.events)

      const startEv = events.find((e) => e.type === 'FREE_SPINS_START')
      const trigEv = events.find((e) => e.type === 'SCATTER_TRIGGER')
      const reEv = events.find((e) => e.type === 'FREE_SPINS_RETRIGGER')
      const endEv = events.find((e) => e.type === 'FREE_SPINS_END')

      if (startEv) {
        const total = parseIntSafe((startEv as any).total) || after
        showBonusIntro(`${total} FREE SPINS`)
      } else if (trigEv && (trigEv as any).freeSpins) {
        showBonusIntro(`${parseIntSafe((trigEv as any).freeSpins)} FREE SPINS`)
      } else if (reEv && ((reEv as any).added || (reEv as any).remaining)) {
        const added = parseIntSafe((reEv as any).added)
        showBonusIntro(added > 0 ? `+${added} FREE SPINS` : `FREE SPINS`)
      } else if (endEv) {
        showBonusIntro(`FREE SPINS END`)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      // rapide, pas lent
      window.setTimeout(() => {
        setSpinning(false)
        inFlight.current = false
      }, 200)
    }
  }

  // ✅ Auto-play pendant free spins (jusqu’à after=0)
  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }

    if (fsActive && fsAfter > 0 && !spinning && !inFlight.current) {
      autoTimerRef.current = window.setTimeout(() => {
        doSpin('auto')
      }, 520) // rapide mais lisible
    }

    return () => {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current)
        autoTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fsActive, fsAfter, spinning])

  const headerTitle = game?.name ?? gameId
  const currency = wallet?.currency ?? 'BRL'

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 pb-[140px] md:pb-[120px]">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
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

        <button
          disabled={!launchUrl}
          onClick={() => setShowProvider(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          PROVIDER VIEW
        </button>
      </div>

      {/* GRID + overlays */}
      <div className="relative">
        {/* Overlay FREE SPINS MODE */}
        {fsActive ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
            <div className="rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.35)]">
              FREE SPINS MODE • {fsAfter} LEFT • x{fsMultiplier}
            </div>
          </div>
        ) : null}

        {/* Bonus Intro */}
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
          // Si tu veux brancher tes sons: à chaque changement de ligne gagnante
          onWinLineChange={(idx) => {
            // toi tu mettras ton son ici
            // console.log('WIN LINE INDEX', idx)
          }}
        />
      </div>

      {/* Panel bottom responsive */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1100px] px-3 py-3">
          <SpinPanel
            balance={Number.isFinite(animBalance) ? animBalance : balanceNumber}
            win={Number.isFinite(animWin) ? animWin : win}
            bet={bet}
            setBet={(v) => {
              // lock bet during free spins
              if (fsActive) return
              setBet(v)
            }}
            onSpin={() => doSpin('manual')}
            spinning={spinning || (fsActive && fsAfter > 0)}
          />
          {fsActive ? (
            <div className="mt-2 text-center text-xs font-semibold text-white/70">
              Bet locked during free spins • Provider controls betCost
            </div>
          ) : null}
        </div>
      </div>

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
