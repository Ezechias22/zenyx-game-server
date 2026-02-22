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

type ProviderEvent = { t?: string; type?: string; d?: any; [k: string]: unknown }

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
    .map((x) => {
      const anyX: any = x
      const t = typeof anyX.t === 'string' ? anyX.t : typeof anyX.type === 'string' ? anyX.type : 'UNKNOWN'
      return { ...anyX, t }
    })
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

  if (!map.W && (map as any).wild) map.W = (map as any).wild
  if (!map.S && (map as any).scatter) map.S = (map as any).scatter
  if (!(map as any).wild && map.W) (map as any).wild = map.W
  if (!(map as any).scatter && map.S) (map as any).scatter = map.S

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

  const [fsActive, setFsActive] = useState(false)
  const [fsAfter, setFsAfter] = useState(0)
  const [fsMultiplier, setFsMultiplier] = useState(1)
  const [betCost, setBetCost] = useState(1)

  const [bonusIntro, setBonusIntro] = useState(false)
  const [bonusText, setBonusText] = useState('')

  const [fsEndOpen, setFsEndOpen] = useState(false)
  const [fsEndTotalWin, setFsEndTotalWin] = useState(0)
  const [fsEndGameId, setFsEndGameId] = useState('')

  const [buyOpen, setBuyOpen] = useState(false)
  const [buyBusy, setBuyBusy] = useState(false)

  const animBalance = useAnimatedNumber(balanceNumber, 260)
  const animWin = useAnimatedNumber(win, 220)
  const animFs = useAnimatedNumber(fsAfter, 240)

  const autoTimerRef = useRef<number | null>(null)

  // ✅ BLOCK SCROLL/SWIPE on this page
  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    const prevTouch = (document.body.style as any).touchAction

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    ;(document.body.style as any).touchAction = 'none'

    return () => {
      document.documentElement.style.overflow = prevOverflow
      document.body.style.overflow = prevBodyOverflow
      ;(document.body.style as any).touchAction = prevTouch
    }
  }, [])

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

  function showBonus(text: string) {
    setBonusText(text)
    setBonusIntro(true)
    window.setTimeout(() => setBonusIntro(false), 1300)
  }

  async function doSpin(
    trigger: 'manual' | 'auto' = 'manual',
    extra?: { buyFreeSpins?: boolean; idempotencyKey?: string }
  ) {
    if (!sessionId) return
    if (inFlight.current) return

    inFlight.current = true
    setSpinning(true)
    setError('')
    setWin(0)
    setWins([])

    try {
      const betToSend = Math.max(1, Number(bet) || 1)
      const payload: any = {
        sessionId,
        bet: betToSend,
        ...(extra?.buyFreeSpins ? { buyFreeSpins: true } : {}),
        ...(extra?.idempotencyKey ? { idempotencyKey: extra.idempotencyKey } : {})
      }

      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const raw = (await res.json()) as ProviderPlayResponse
      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      if (raw?.balance) {
        setWallet(raw.balance)
        setBalanceNumber(parseDecimal(raw.balance.balance))
      }

      const g = to5x3(raw?.result?.grid)
      if (g) setGrid(g)

      const winList = normalizeProviderWins(raw?.result?.wins)
      setWins(winList)

      setWin(parseDecimal(raw?.result?.win ?? raw?.win ?? 0))

      const fs = raw?.result?.freeSpins
      const after = parseIntSafe(fs?.after)
      const active = Boolean(fs?.active) || after > 0
      const mult = Math.max(1, parseDecimal(fs?.multiplier ?? 1))
      setFsAfter(after)
      setFsActive(active)
      setFsMultiplier(mult)

      setBetCost(parseDecimal(raw?.result?.betCost ?? 1))

      const events = normalizeEvents(raw?.result?.events)

      const startEv = events.find((e) => e.t === 'FREE_SPINS_START')
      const trigEv = events.find((e) => e.t === 'SCATTER_TRIGGER')
      const reEv = events.find((e) => e.t === 'FREE_SPINS_RETRIGGER')
      const endEv = events.find((e) => e.t === 'FREE_SPINS_END')

      if (startEv) {
        const total = parseIntSafe((startEv as any)?.d?.total) || after
        showBonus(`${total} FREE SPINS`)
      } else if (trigEv) {
        const freeSpins = parseIntSafe((trigEv as any)?.d?.freeSpins)
        if (freeSpins > 0) showBonus(`${freeSpins} FREE SPINS`)
      } else if (reEv) {
        const added = parseIntSafe((reEv as any)?.d?.added)
        if (added > 0) showBonus(`+${added} FREE SPINS`)
      }

      if (endEv) {
        const totalWinStr = String((endEv as any)?.d?.totalWin ?? '0')
        const totalWin = parseDecimal(totalWinStr)
        const uiGameId = String((endEv as any)?.d?.ui?.gameId ?? gameId ?? '')
        setFsEndTotalWin(totalWin)
        setFsEndGameId(uiGameId || gameId)
        setFsEndOpen(true)
        showBonus(`FREE SPINS COMPLETE`)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      window.setTimeout(() => {
        setSpinning(false)
        inFlight.current = false
      }, 180)
    }
  }

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

  // Background from provider (optional)
  const bg = game?.assets?.background
    ? (game.assets.background.startsWith('http')
        ? game.assets.background
        : `${PROVIDER_BASE_URL.replace(/\/$/, '')}${game.assets.background.startsWith('/') ? '' : '/'}${game.assets.background}`)
    : ''

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: bg ? `url(${bg})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: bg ? 'saturate(1.1) contrast(1.05)' : undefined
        }}
      />
      <div className="absolute inset-0 -z-10 bg-black/55" />

      <div className="mx-auto h-full w-full max-w-[1100px] px-3 pt-3 pb-[88px] md:pb-[92px] overflow-hidden">
        {error ? (
          <div className="mb-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {/* Header (remove PROVIDER VIEW for prod) */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-extrabold leading-none">{headerTitle}</div>
            <div className="mt-1 text-[11px] leading-none text-white/70">
              {currency} • {(animBalance || 0).toFixed(2)}
              {fsActive ? (
                <span className="ml-2 font-extrabold text-amber-200">
                  FS {Math.max(0, Math.round(animFs))} • x{fsMultiplier}
                </span>
              ) : null}
              {betCost === 0 ? <span className="ml-2 text-emerald-200/90">• FREE</span> : null}
            </div>
          </div>

          {/* ✅ hidden by default (tu peux remettre en dev si tu veux) */}
          <button
            onClick={() => setShowProvider(true)}
            className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 md:block"
            disabled={!launchUrl}
          >
            PROVIDER VIEW
          </button>
        </div>

        {/* Grid area (centered, no scroll) */}
        <div className="flex h-[calc(100dvh-88px-58px)] flex-col items-center justify-center overflow-hidden md:h-[calc(100dvh-92px-58px)]">
          <div className="relative w-full">
            {fsActive ? (
              <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2">
                <div className="rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-[11px] font-extrabold text-amber-100 shadow-[0_0_28px_rgba(245,158,11,0.30)]">
                  FREE SPINS MODE • {fsAfter} LEFT • x{fsMultiplier}
                </div>
              </div>
            ) : null}

            {bonusIntro ? (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-500/22 via-purple-500/12 to-black/40 backdrop-blur-[1px] animate-[fadeInOut_1.3s_ease-in-out_forwards]" />
                <div className="relative z-10 text-center">
                  <div className="text-[clamp(18px,4vw,34px)] font-black tracking-tight text-white drop-shadow-[0_0_26px_rgba(245,158,11,0.33)]">
                    BONUS
                  </div>
                  <div className="mt-2 text-[clamp(11px,2.2vw,14px)] font-extrabold text-amber-100/95">
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

          {/* BUY FREE SPINS under grid */}
          <div className="mt-3 w-full max-w-[760px]">
            <button
              onClick={() => {
                if (fsActive) return
                setBuyOpen(true)
              }}
              disabled={spinning || fsActive}
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white/90 hover:bg-white/15 disabled:opacity-50"
            >
              BUY FREE SPINS
            </button>
          </div>
        </div>
      </div>

      {/* Bottom panel compact */}
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

      <FreeSpinsEndOverlay
        open={fsEndOpen}
        gameId={fsEndGameId || gameId}
        totalWin={fsEndTotalWin}
        currency={currency}
        onClose={() => setFsEndOpen(false)}
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