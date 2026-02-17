'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SpinPanel from '@/components/SpinPanel'
import SlotGrid from '@/components/SlotGrid'
import ProviderLaunchFrame from '@/components/ProviderLaunchFrame'
import { PAYLINES_20 } from '@/constants/paylines'
import { normalizePlayResponse } from '@/lib/normalize'

type Wallet = { playerExternalId: string; currency: string; balance: string }

type SoundEvent =
  | { type: 'spin' }
  | { type: 'win' }
  | { type: 'bonus' }
  | { type: 'click' }

function parseDecimal(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function empty5x3(): string[][] {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => 'A'))
}

// accept provider 5x3 OR 3x5
function to5x3(raw: any): string[][] | null {
  if (!Array.isArray(raw)) return null

  // 5x3 reel x row
  if (
    raw.length === 5 &&
    raw.every((c: any) => Array.isArray(c) && c.length === 3 && c.every((x: any) => typeof x === 'string'))
  ) {
    return raw
  }

  // 3x5 row x reel -> transpose
  if (
    raw.length === 3 &&
    raw.every((r: any) => Array.isArray(r) && r.length === 5 && r.every((x: any) => typeof x === 'string'))
  ) {
    const out = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
    for (let row = 0; row < 3; row++) for (let reel = 0; reel < 5; reel++) out[reel][row] = raw[row][reel]
    return out
  }

  return null
}

// ✅ Normalize symbol key (trim + uppercase)
function normKey(v: any): string {
  return String(v ?? '').trim()
}

// ✅ Scatter detector tolerant
function isScatterKey(key: string): boolean {
  const k = key.trim()
  if (!k) return false
  const u = k.toUpperCase()
  return u === 'S' || u === 'SC' || u === 'SCATTER' || u === 'SCATTERSYMBOL'
}

function countScatters(grid5x3: string[][]): number {
  let c = 0
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 3; row++) {
      if (isScatterKey(normKey(grid5x3?.[reel]?.[row]))) c++
    }
  }
  return c
}

// Your rule: 3 scatters => 8 FS (only)
function freeSpinReward(scatterCount: number): number {
  return scatterCount >= 3 ? 8 : 0
}

// UI-side payline win detection (wild=W)
function detectWinningLines(grid5x3: string[][]): number[] {
  const wins: number[] = []
  const WILD = 'W'

  for (let i = 0; i < PAYLINES_20.length; i++) {
    const line = PAYLINES_20[i]
    const seq = line.map((row, reel) => normKey(grid5x3?.[reel]?.[row]))

    // base symbol = first non-wild, non-scatter
    let base = ''
    for (let r = 0; r < seq.length; r++) {
      const s = seq[r]
      if (!s) break
      if (isScatterKey(s)) break
      if (s.toUpperCase() !== WILD) {
        base = s
        break
      }
    }
    if (!base) continue

    const b = base.toUpperCase()
    let count = 0
    for (let r = 0; r < seq.length; r++) {
      const s = seq[r]
      if (!s) break
      if (isScatterKey(s)) break
      const u = s.toUpperCase()
      if (u === b || u === WILD) count++
      else break
    }
    if (count >= 3) wins.push(i)
  }

  return wins
}

export default function PlayClient() {
  const router = useRouter()
  const params = useSearchParams()

  const gameId = params.get('gameId') ?? ''
  const sessionIdParam = params.get('sessionId') ?? ''

  const PROVIDER_BASE_URL = useMemo(() => {
    return process.env.NEXT_PUBLIC_PROVIDER_BASE_URL || 'https://zenyx-games-provider-production.up.railway.app'
  }, [])

  const [sessionId, setSessionId] = useState(sessionIdParam)
  const [launchUrl, setLaunchUrl] = useState('')

  const [grid, setGrid] = useState<string[][]>(() => empty5x3())
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceNumber, setBalanceNumber] = useState<number>(0)
  const [win, setWin] = useState<number>(0)
  const [bet, setBet] = useState<number>(1)

  const [error, setError] = useState<string>('')

  const [spinning, setSpinning] = useState(false)
  const inFlightRef = useRef(false)

  const [winningLines, setWinningLines] = useState<number[]>([])

  const [freeSpinsLeft, setFreeSpinsLeft] = useState<number>(0)
  const [showFreeSpinPopup, setShowFreeSpinPopup] = useState(false)

  const [showProvider, setShowProvider] = useState(false)

  const onSound = (e: SoundEvent) => {
    // plug your audio here
    // console.log('SOUND', e)
  }

  // Ensure session
  useEffect(() => {
    if (!gameId) {
      setError('Missing gameId')
      return
    }

    if (sessionIdParam) {
      setSessionId(sessionIdParam)
      const base = PROVIDER_BASE_URL.replace(/\/$/, '')
      setLaunchUrl(`${base}/v1/launch?s=${encodeURIComponent(sessionIdParam)}`)
      return
    }

    let alive = true
    ;(async () => {
      try {
        setError('')
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ gameCode: gameId, playerExternalId: 'player_demo_123', currency: 'BRL' })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Session error')
        if (!alive) return

        setSessionId(json.sessionId)
        setBalanceNumber(parseDecimal(json.balance))

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
    if (!sessionId || !gameId) return
    if (inFlightRef.current) return

    inFlightRef.current = true
    setSpinning(true)
    setError('')
    setWin(0)
    setWinningLines([])

    onSound({ type: 'spin' })

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, bet: freeSpinsLeft > 0 ? 0 : bet })
      })

      const raw = await res.json()
      console.log('PLAY RAW RESPONSE:', raw)
      console.log('GRID RAW:', raw?.result?.grid)

      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      if (raw?.balance && typeof raw.balance === 'object') {
        setWallet(raw.balance as Wallet)
        setBalanceNumber(parseDecimal((raw.balance as Wallet).balance))
      }

      const g = to5x3(raw?.result?.grid)
      if (g) {
        setGrid(g)

        const scatters = countScatters(g)
        console.log('SCATTER COUNT (normalized):', scatters)

        const reward = freeSpinReward(scatters)
        if (reward > 0) {
          onSound({ type: 'bonus' })
          setFreeSpinsLeft((prev) => prev + reward)
          setShowFreeSpinPopup(true)
          setTimeout(() => setShowFreeSpinPopup(false), 1800)
        }

        const wins = detectWinningLines(g)
        setWinningLines(wins)
        if (wins.length > 0) onSound({ type: 'win' })
      }

      const normalized = normalizePlayResponse(raw, { gameId, providerBaseUrl: PROVIDER_BASE_URL })
      setWin(normalized.win)
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      setTimeout(() => {
        setSpinning(false)
        inFlightRef.current = false
        if (freeSpinsLeft > 0) setFreeSpinsLeft((prev) => Math.max(0, prev - 1))
      }, 650)
    }
  }

  // auto-run free spins
  useEffect(() => {
    if (!sessionId) return
    if (freeSpinsLeft <= 0) return
    if (spinning) return
    if (inFlightRef.current) return

    const t = setTimeout(() => doSpin(), 420)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeSpinsLeft, sessionId, spinning])

  return (
    <div className="pb-32 relative">
      {showFreeSpinPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="rounded-3xl border border-amber-300/25 bg-amber-500/15 px-8 py-5 text-center shadow-[0_0_60px_rgba(245,158,11,0.35)]">
            <div className="text-xl font-extrabold text-amber-200">FREE SPINS AWARDED</div>
            <div className="mt-1 text-sm font-bold text-amber-100">+8 spins</div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-extrabold tracking-tight">{gameId || 'play'}</div>
          <div className="mt-1 text-xs text-white/60">
            Session: {sessionId ? 'LIVE' : '...'} • {wallet?.currency ?? 'BRL'}
            {freeSpinsLeft > 0 ? <span className="ml-2 text-amber-200 font-bold">FS: {freeSpinsLeft}</span> : null}
          </div>
        </div>

        <button
          disabled={!sessionId}
          onClick={() => setShowProvider(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          PROVIDER VIEW
        </button>
      </div>

      <SlotGrid
        gameId={gameId}
        providerBase={PROVIDER_BASE_URL}
        grid={grid}
        spinning={spinning}
        winningLines={winningLines}
      />

      <SpinPanel
        balance={balanceNumber}
        win={win}
        bet={bet}
        setBet={setBet}
        onSpin={doSpin}
        spinning={spinning || freeSpinsLeft > 0}
      />

      {showProvider && launchUrl ? (
        <ProviderLaunchFrame launchUrl={launchUrl} onClose={() => setShowProvider(false)} />
      ) : null}
    </div>
  )
}
