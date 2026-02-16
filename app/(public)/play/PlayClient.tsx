'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReelGrid from '@/components/ReelGrid'
import SpinPanel from '@/components/SpinPanel'
import ProviderLaunchFrame from '@/components/ProviderLaunchFrame'
import type { SymbolAsset } from '@/lib/types'
import { normalizePlayResponse } from '@/lib/normalize'

type Wallet = {
  playerExternalId: string
  currency: string
  balance: string
}

function emptyGrid(): SymbolAsset[][] {
  return Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({ id: `EMPTY_${r}_${c}`, src: '' }))
  )
}

function safe3x5(grid: SymbolAsset[][] | undefined | null): SymbolAsset[][] {
  const out = emptyGrid()
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = grid?.[r]?.[c]
      if (cell && typeof cell === 'object') {
        out[r][c] = {
          id: typeof cell.id === 'string' ? cell.id : `CELL_${r}_${c}`,
          src: typeof cell.src === 'string' ? cell.src : ''
        }
      }
    }
  }
  return out
}

function parseDecimal(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export default function PlayClient() {
  const router = useRouter()
  const params = useSearchParams()

  const gameId = params.get('gameId') ?? ''
  const sessionIdParam = params.get('sessionId') ?? ''

  const [sessionId, setSessionId] = useState(sessionIdParam)
  const [launchUrl, setLaunchUrl] = useState('')
  const [showProvider, setShowProvider] = useState(false)

  const [grid, setGrid] = useState<SymbolAsset[][]>(() => emptyGrid())

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balanceNumber, setBalanceNumber] = useState<number>(0)

  const [win, setWin] = useState<number>(0)
  const [bet, setBet] = useState<number>(1)
  const [error, setError] = useState<string>('')

  const [spinning, setSpinning] = useState(false)
  const inFlightRef = useRef(false)

  const PROVIDER_BASE_URL = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_PROVIDER_BASE_URL ||
      'https://zenyx-games-provider-production.up.railway.app'
    )
  }, [])

  // ✅ Create session if missing sessionId in URL
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
        setLaunchUrl(typeof json.launchUrl === 'string' ? json.launchUrl : '')
        setBalanceNumber(parseDecimal(json.balance))

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

  async function onSpin() {
    if (!sessionId || !gameId) return
    if (inFlightRef.current) return

    inFlightRef.current = true
    setSpinning(true)
    setError('')
    setWin(0)

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, bet })
      })

      const raw = await res.json()

      // 🔍 DEBUG GRID SHAPE + CONTENT
      console.log('PLAY RAW RESPONSE:', raw)
      console.log('GRID RAW:', raw?.result?.grid)

      if (!res.ok) throw new Error(raw?.error || 'Spin failed')

      // ✅ Provider wallet object: raw.balance.balance
      if (raw?.balance && typeof raw.balance === 'object') {
        setWallet(raw.balance as Wallet)
        setBalanceNumber(parseDecimal((raw.balance as Wallet).balance))
      }

      const normalized = normalizePlayResponse(raw, {
        gameId,
        providerBaseUrl: PROVIDER_BASE_URL
      })

      setGrid(safe3x5(normalized.grid))
      setWin(normalized.win)
    } catch (e: any) {
      setError(e?.message ?? 'Spin error')
      setGrid(g => safe3x5(g))
    } finally {
      setTimeout(() => {
        setSpinning(false)
        inFlightRef.current = false
      }, 650)
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
          disabled={!launchUrl}
          onClick={() => setShowProvider(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          PROVIDER VIEW
        </button>
      </div>

      <ReelGrid grid={grid} spinning={spinning} />

      <SpinPanel
        balance={balanceNumber}
        win={win}
        bet={bet}
        setBet={setBet}
        onSpin={onSpin}
        spinning={spinning}
      />

      {showProvider && launchUrl ? (
        <ProviderLaunchFrame launchUrl={launchUrl} onClose={() => setShowProvider(false)} />
      ) : null}
    </div>
  )
}
