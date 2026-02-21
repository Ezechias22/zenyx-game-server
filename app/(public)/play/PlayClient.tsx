'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SpinPanel from '@/components/SpinPanel'
import SlotGrid, { type ProviderWin, type SymbolMap } from '@/components/SlotGrid'
import ProviderLaunchFrame from '@/components/ProviderLaunchFrame'
import JackpotDisplay from '@/components/JackpotDisplay'
import BonusWheel from '@/components/BonusWheel'
import GambleModal from '@/components/GambleModal'

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

type ProviderEvent = {
  t: string
  d?: Record<string, unknown>
}

type ProviderPlayResponse = {
  balance?: Wallet
  result?: {
    grid?: unknown
    win?: unknown
    wins?: unknown
    betCost?: unknown
    feature?: unknown

    buyFreeSpins?: unknown

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

function to5x3(raw: unknown): string[][] | null {
  if (!Array.isArray(raw)) return null

  if (raw.length === 5 && raw.every((c) => Array.isArray(c) && (c as unknown[]).length === 3)) {
    return raw.map((col) => (col as unknown[]).map((x) => String(x ?? '')))
  }

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
      t: typeof (x as any).t === 'string' ? String((x as any).t) : 'UNKNOWN',
      d: (x as any).d && typeof (x as any).d === 'object' ? ((x as any).d as Record<string, unknown>) : undefined
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
    .filter((w: ProviderWin) => w.positions.length >= 2)
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

  const [error, setError] = useState('')
  const [spinning, setSpinning] = useState(false)
  const inFlight = useRef(false)

  const [showProvider, setShowProvider] = useState(false)

  // Free spins (source = provider)
  const [fsActive, setFsActive] = useState(false)
  const [fsAfter, setFsAfter] = useState(0)
  const [fsMultiplier, setFsMultiplier] = useState(1)
  const [betCost, setBetCost] = useState(1)

  // Jackpot (events)
  const [jackpotMeter, setJackpotMeter] = useState(0)
  const [jackpotLastWin, setJackpotLastWin] = useState(0)

  // Bonus Wheel (events)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [wheelMult, setWheelMult] = useState<number | null>(null)

  // Gamble (feature + events)
  const [canGamble, setCanGamble] = useState(false)
  const [gambleOpen, setGambleOpen] = useState(false)
  const [gambleStake, setGambleStake] = useState(0)
  const [gamblePayout, setGamblePayout] = useState(0)
  const [gambleWin, setGambleWin] = useState<boolean | null>(null)

  // UI intro
  const [bonusIntro, setBonusIntro] = useState(false)
  const [bonusText, setBonusText] = useState('')

  const animBalance = useAnimatedNumber(balanceNumber, 300)
  const animWin = useAnimatedNumber(win, 220)
  const animFs = useAnimatedNumber(fsAfter, 240)

  const autoTimerRef = useRef<number | null>(null)

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

  function showIntro(text: string) {
    setBonusText(text)
    setBonusIntro(true)
    window.setTimeout(() => setBonusIntro(false), 1400)
  }

  function applyEvents(events: ProviderEvent[]) {
    for (const ev of events) {
      if (ev.t === 'JACKPOT_METER_UPDATE') {
        const after = parseDecimal(ev.d?.meterAfter)
        if (after > 0) setJackpotMeter(after)
      }
      if (ev.t === 'JACKPOT_WIN') {
        const payout = parseDecimal(ev.d?.payout)
        if (payout > 0) {
          setJackpotLastWin(payout)
          showIntro(`JACKPOT +${payout.toFixed(2)}`)
          window.setTimeout(() => setJackpotLastWin(0), 2200)
        }
      }
      if (ev.t === 'BONUS_WHEEL_START') {
        setWheelMult(null)
        setWheelOpen(true)
        showIntro('BONUS WHEEL')
      }
      if (ev.t === 'BONUS_WHEEL_RESULT') {
        const m = Math.max(1, parseDecimal(ev.d?.multiplier))
        setWheelMult(m)
        showIntro(`WHEEL x${m}`)
        window.setTimeout(() => setWheelOpen(false), 1600)
      }
      if (ev.t === 'GAMBLE_START') {
        const stake = parseDecimal(ev.d?.stake)
        setGambleStake(stake)
        setGamblePayout(0)
        setGambleWin(null)
        setGambleOpen(true)
      }
      if (ev.t === 'GAMBLE_RESULT') {
        const winBool = Boolean(ev.d?.win)
        const payout = parseDecimal(ev.d?.payout)
        setGambleWin(winBool)
        setGamblePayout(payout)
      }
      if (ev.t === 'FREE_SPINS_START') {
        // display only (provider authoritative)
        // fsAfter sera mis à jour via result.freeSpins.after
        showIntro('FREE SPINS')
      }
      if (ev.t === 'FREE_SPINS_RETRIGGER') {
        const added = parseIntSafe(ev.d?.added)
        if (added > 0) showIntro(`+${added} FREE SPINS`)
      }
      if (ev.t === 'FREE_SPINS_END') {
        showIntro('FREE SPINS END')
      }
    }
  }

  async function doSpin(opts?: { buyFreeSpins?: boolean }) {
    if (!sessionId) return
    if (inFlight.current) return

    inFlight.current = true
    setSpinning(true)
    setError('')
    setWin(0)
    setWins([])
    setCanGamble(false)

    try {
      const betToSend = Math.max(1, Number(bet) || 1)

      const payload = {
        sessionId,
        bet: betToSend,
        ...(opts?.buyFreeSpins ? { buyFreeSpins: true } : {})
      }

      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const raw = (await res.json()) as ProviderPlayResponse

      if (!res.ok) throw new Error((raw as any)?.error || 'Spin failed')

      // balance (source unique)
      if (raw?.balance) {
        setWallet(raw.balance)
        setBalanceNumber(parseDecimal(raw.balance.balance))
      }

      // grid
      const g = to5x3(raw?.result?.grid)
      if (g) setGrid(g)

      // wins (paylines ONLY on wins)
      const winList = normalizeProviderWins(raw?.result?.wins)
      setWins(winList)

      // win
      setWin(parseDecimal(raw?.result?.win ?? raw?.win ?? 0))

      // free spins (source = provider)
      const fs = raw?.result?.freeSpins
      const after = parseIntSafe(fs?.after)
      const active = Boolean(fs?.active) || after > 0
      const mult = Math.max(1, parseDecimal(fs?.multiplier ?? 1))

      setFsAfter(after)
      setFsActive(active)
      setFsMultiplier(mult)

      // betCost = 0 => free spin
      setBetCost(parseDecimal(raw?.result?.betCost ?? 1))

      // events
      const events = normalizeEvents(raw?.result?.events)
      applyEvents(events)

      // gamble feature (open button)
      const feature = typeof raw?.result?.feature === 'string' ? raw.result.feature : ''
      if (feature === 'GAMBLE') {
        setCanGamble(true)
        // si provider renvoie directement des events gamble dans la même réponse, modal s’ouvrira via applyEvents()
      }
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      window.setTimeout(() => {
        setSpinning(false)
        inFlight.current = false
      }, 200)
    }
  }

  // autoplay free spins
  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }

    if (fsActive && fsAfter > 0 && !spinning && !inFlight.current) {
      autoTimerRef.current = window.setTimeout(() => {
        doSpin()
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

  const headerTitle = game?.name ?? gameId
  const currency = wallet?.currency ?? 'BRL'
  const fsLocked = fsActive && fsAfter > 0

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 pb-[160px] md:pb-[140px]">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">{headerTitle}</div>
          <div className="mt-1 text-xs text-white/60">
            {currency} • Balance: {(animBalance || 0).toFixed(2)}
            {fsActive ? (
              <span className="ml-2 font-extrabold text-amber-200">
                FREE SPINS: {Math.max(0, Math.round(animFs))} • x{fsMultiplier}
              </span>
            ) : null}
            {betCost === 0 ? <span className="ml-2 text-emerald-200/90">• FREE SPIN</span> : null}
          </div>

          <div className="mt-2">
            <JackpotDisplay meter={jackpotMeter} lastWin={jackpotLastWin} />
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

      <div className="relative">
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
          onWinLineChange={() => {
            // ici tu ajoutes tes sons par ligne gagnante si tu veux
          }}
        />
      </div>

      {/* overlays */}
      <BonusWheel open={wheelOpen} multiplier={wheelMult} onClose={() => setWheelOpen(false)} />
      <GambleModal
        open={gambleOpen}
        stake={gambleStake}
        payout={gamblePayout}
        win={gambleWin}
        onClose={() => setGambleOpen(false)}
      />

      <SpinPanel
        balance={Number.isFinite(animBalance) ? animBalance : balanceNumber}
        win={Number.isFinite(animWin) ? animWin : win}
        bet={bet}
        setBet={setBet}
        onSpin={() => doSpin()}
        spinning={spinning || (fsActive && fsAfter > 0)}
        onBuyFreeSpins={() => doSpin({ buyFreeSpins: true })}
        onOpenGamble={() => setGambleOpen(true)}
        canGamble={canGamble && win > 0}
        fsLocked={fsLocked}
      />

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