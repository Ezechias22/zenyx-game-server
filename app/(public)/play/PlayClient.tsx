'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SpinPanel from '@/components/SpinPanel'
import ProviderLaunchFrame from '@/components/ProviderLaunchFrame'
import SlotGrid, { SoundEvent } from '@/components/SlotGrid'
import { PAYLINES_20 } from '@/constants/paylines'
import { normalizePlayResponse } from '@/lib/normalize'

type Wallet = {
  playerExternalId: string
  currency: string
  balance: string
}

function parseDecimal(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function emptyProviderGrid(): string[][] {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => 'A'))
}

function is5x3Grid(g: any): g is string[][] {
  return (
    Array.isArray(g) &&
    g.length === 5 &&
    g.every((col) => Array.isArray(col) && col.length === 3 && col.every((x) => typeof x === 'string'))
  )
}

/**
 * ✅ Basic SLOT line win detection (UI-side):
 * - left to right
 * - Wild = "W"
 * - Scatter = "S" ignored for line matching
 * - needs at least 3 matching reels
 */
function detectWinningLines(grid: string[][]): number[] {
  const wins: number[] = []
  const WILD = 'W'
  const SCATTER = 'S'

  for (let i = 0; i < PAYLINES_20.length; i++) {
    const line = PAYLINES_20[i]
    const seq = line.map((row, reel) => grid?.[reel]?.[row] ?? '')

    // find base symbol: first non-wild, non-scatter from left
    let base = ''
    for (let r = 0; r < seq.length; r++) {
      const s = seq[r]
      if (!s || s === SCATTER) break // scatter breaks typical payline
      if (s !== WILD) {
        base = s
        break
      }
    }
    if (!base) continue

    // count consecutive matches from reel0
    let count = 0
    for (let r = 0; r < seq.length; r++) {
      const s = seq[r]
      if (!s || s === SCATTER) break
      if (s === base || s === WILD) count++
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

  const [sessionId, setSessionId] = useState(sessionIdParam)
  const [launchUrl, setLaunchUrl] = useState('')
  const [showProvider, setShowProvider] = useState(false)

  const [providerGrid, setProviderGrid] = useState<string[][]>(() => emptyProviderGrid())

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceNumber, setBalanceNumber] = useState<number>(0)

  const [win, setWin] = useState<number>(0)
  const [bet, setBet] = useState<number>(1)
  const [error, setError] = useState<string>('')

  const [spinning, setSpinning] = useState(false)
  const inFlightRef = useRef(false)

  // Paylines UI state
  const [selectedLine, setSelectedLine] = useState<number>(0)
  const [showAllLines, setShowAllLines] = useState<boolean>(false)
  const [winningLines, setWinningLines] = useState<number[]>([])

  const PROVIDER_BASE_URL = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_PROVIDER_BASE_URL ||
      'https://zenyx-games-provider-production.up.railway.app'
    )
  }, [])

  // 🔊 Sound hook (you implement audio)
  const onSound = (e: SoundEvent) => {
    // TODO: plug your audio here
    // examples:
    // if (e.type === 'spin') play('spin')
    // if (e.type === 'stop') play(`stop_${e.reelIndex}`)
    // if (e.type === 'win') play('win')
    // if (e.type === 'lineChange') play('tick')
    // if (e.type === 'click') play('click')
    // console.log('SOUND', e)
  }

  // ✅ Create session if missing sessionId
  useEffect(() => {
    if (!gameId) {
      setError('Missing gameId')
      return
    }

    if (sessionIdParam) {
      setSessionId(sessionIdParam)
      return
    }

    let alive = true
    ;(async () => {
      try {
        setError('')
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            gameCode: gameId,
            playerExternalId: 'player_demo_123',
            currency: 'BRL'
          })
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

  // ✅ Auto-cycle ONLY winning lines (when there are wins)
  useEffect(() => {
    if (winningLines.length <= 1) return

    let i = 0
    const t = setInterval(() => {
      setShowAllLines(false)
      setSelectedLine(winningLines[i])
      onSound({ type: 'lineChange', lineIndex: winningLines[i] })
      i = (i + 1) % winningLines.length
    }, 900)

    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winningLines])

  async function onSpin() {
    if (!sessionId || !gameId) return
    if (inFlightRef.current) return

    inFlightRef.current = true
    setSpinning(true)
    setError('')
    setWin(0)
    setWinningLines([])

    // If no wins, advance line each spin (fast casino feel)
    setShowAllLines(false)
    setSelectedLine((prev) => (prev + 1) % PAYLINES_20.length)
    onSound({ type: 'lineChange', lineIndex: (selectedLine + 1) % PAYLINES_20.length })

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, bet })
      })

      const raw = await res.json()

      // DEBUG (optional)
      // console.log('PLAY RAW RESPONSE:', raw)
      // console.log('GRID RAW:', raw?.result?.grid)

      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      // wallet
      if (raw?.balance && typeof raw.balance === 'object') {
        setWallet(raw.balance as Wallet)
        setBalanceNumber(parseDecimal((raw.balance as Wallet).balance))
      }

      // provider grid 5x3
      const rg = raw?.result?.grid
      if (is5x3Grid(rg)) {
        setProviderGrid(rg)

        // detect winning lines (UI-side)
        const wins = detectWinningLines(rg)
        setWinningLines(wins)

        // if there are wins, immediately show first win line (and auto-cycle will start)
        if (wins.length > 0) {
          setShowAllLines(false)
          setSelectedLine(wins[0])
          onSound({ type: 'lineChange', lineIndex: wins[0] })
          onSound({ type: 'win' })
        }
      }

      // win number (provider)
      const normalized = normalizePlayResponse(raw, { gameId, providerBaseUrl: PROVIDER_BASE_URL })
      setWin(normalized.win)
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
    } finally {
      setTimeout(() => {
        setSpinning(false)
        inFlightRef.current = false
      }, 550)
    }
  }

  return (
    <div className="pb-28">
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
        grid={providerGrid}
        spinning={spinning}
        selectedLine={selectedLine}
        setSelectedLine={setSelectedLine}
        showAllLines={showAllLines}
        setShowAllLines={setShowAllLines}
        winningLines={winningLines}
        onSound={onSound}
      />

      <SpinPanel
        balance={balanceNumber}
        win={win}
        bet={bet}
        setBet={setBet}
        onSpin={onSpin}
        spinning={spinning}
        onSound={(name) => {
          // keep compatibility with your SpinPanel hook
          if (name === 'click') onSound({ type: 'click' })
          if (name === 'spin') onSound({ type: 'spin' })
          if (name === 'win') onSound({ type: 'win' })
          if (name === 'stop') onSound({ type: 'stop', reelIndex: 0 })
        }}
      />

      {showProvider && launchUrl ? (
        <ProviderLaunchFrame launchUrl={launchUrl} onClose={() => setShowProvider(false)} />
      ) : null}
    </div>
  )
}
