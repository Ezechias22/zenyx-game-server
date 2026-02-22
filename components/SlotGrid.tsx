'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type SymbolMap = Record<string, string>

export type ProviderWin = {
  positions: Array<{ reel: number; row: number }>
}

type Props = {
  grid: string[][] // 5x3 => grid[reel][row]
  spinning: boolean
  providerBaseUrl: string
  gameId: string
  symbolMap: SymbolMap
  wins: ProviderWin[]
  fsActive: boolean
  fsRemaining: number
  onWinLineChange?: (index: number) => void
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function keyOf(cell: string): string {
  return String(cell ?? '').trim()
}

function to3x5(grid5x3: string[][]): string[][] {
  const out: string[][] = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => ''))
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 3; row++) out[row][reel] = keyOf(grid5x3?.[reel]?.[row] ?? '')
  }
  return out
}

function getAssetUrl(base: string, gameId: string, symbolKey: string, symbolMap: SymbolMap): string {
  const key = keyOf(symbolKey)
  if (!key) return ''
  const direct = symbolMap[key]
  if (direct) return direct
  const b = base.replace(/\/$/, '')
  return `${b}/assets/${gameId}/symbols/${encodeURIComponent(key)}.png`
}

function winPositionsToPolyline(win: ProviderWin) {
  const pts = win.positions
    .slice()
    .sort((a, b) => a.reel - b.reel)
    .map((p) => {
      const reel = clamp(p.reel, 0, 4)
      const row = clamp(p.row, 0, 2)
      const x = (reel / 4) * 1000
      const y = (row / 2) * 600
      return `${x},${y}`
    })
    .join(' ')
  return pts
}

function empty5x3(): string[][] {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
}

export default function SlotGrid({
  grid,
  spinning,
  providerBaseUrl,
  gameId,
  symbolMap,
  wins,
  fsActive,
  fsRemaining,
  onWinLineChange
}: Props) {
  // rolling
  const [rollingGrid, setRollingGrid] = useState<string[][]>(() => (grid?.length ? grid : empty5x3()))
  const rollTimerRef = useRef<number | null>(null)

  const symbolKeys = useMemo(() => {
    const keys = Object.keys(symbolMap || {}).filter(Boolean)
    for (let r = 0; r < 5; r++) for (let y = 0; y < 3; y++) keys.push(String(grid?.[r]?.[y] ?? '').trim())
    const uniq = Array.from(new Set(keys.filter((k) => k && k !== '—')))
    return uniq.length ? uniq : ['A', 'K', 'Q', 'J', '10', '9', 'W', 'S']
  }, [symbolMap, grid])

  function randKey() {
    return symbolKeys[Math.floor(Math.random() * symbolKeys.length)]
  }

  useEffect(() => {
    if (!spinning) {
      if (rollTimerRef.current) {
        window.clearInterval(rollTimerRef.current)
        rollTimerRef.current = null
      }
      setRollingGrid(grid)
      return
    }

    if (rollTimerRef.current) window.clearInterval(rollTimerRef.current)
    rollTimerRef.current = window.setInterval(() => {
      setRollingGrid(() => {
        const next = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
        for (let reel = 0; reel < 5; reel++) {
          for (let row = 0; row < 3; row++) next[reel][row] = randKey()
        }
        return next
      })
    }, 70)

    return () => {
      if (rollTimerRef.current) {
        window.clearInterval(rollTimerRef.current)
        rollTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, symbolKeys.join('|')])

  const gridToRender = spinning ? rollingGrid : grid
  const rows3x5 = useMemo(() => to3x5(gridToRender), [gridToRender])

  const winLines = useMemo(() => wins.filter((w) => w.positions?.length >= 2), [wins])

  const [selectedWinIdx, setSelectedWinIdx] = useState(0)
  const cycleRef = useRef<number | null>(null)

  useEffect(() => {
    setSelectedWinIdx(0)
    if (cycleRef.current) {
      window.clearInterval(cycleRef.current)
      cycleRef.current = null
    }
    if (winLines.length <= 1) return

    cycleRef.current = window.setInterval(() => {
      setSelectedWinIdx((x) => (x + 1) % winLines.length)
    }, 850)

    return () => {
      if (cycleRef.current) {
        window.clearInterval(cycleRef.current)
        cycleRef.current = null
      }
    }
  }, [winLines.length])

  useEffect(() => {
    onWinLineChange?.(selectedWinIdx)
  }, [selectedWinIdx, onWinLineChange])

  const activeWin = winLines[selectedWinIdx] || null
  const activePosKey = useMemo(() => {
    const s = new Set<string>()
    if (!activeWin) return s
    for (const p of activeWin.positions) s.add(`${p.reel}:${p.row}`)
    return s
  }, [activeWin])

  const polylinePoints = activeWin ? winPositionsToPolyline(activeWin) : ''

  return (
    <div className="mx-auto w-full">
      {/* ✅ Taller grid; tight spacing; no drag */}
      <div
        className={[
          'relative mx-auto w-full max-w-[920px]',
          'h-[calc(100dvh-290px)] min-h-[420px] max-h-[780px]',
          'rounded-[26px] border border-white/12 bg-white/6',
          'p-2.5 sm:p-3 md:p-3.5',
          'shadow-[0_22px_90px_rgba(0,0,0,0.52)]',
          'touch-none select-none' // ✅ prevent finger drag
        ].join(' ')}
      >
        {/* ✅ Nearly stuck cells */}
        <div className="grid h-full grid-cols-5 gap-[3px] sm:gap-1 md:gap-1.5">
          {rows3x5.map((rowArr, r) =>
            rowArr.map((sym, c) => {
              const reel = c
              const row = r
              const posKey = `${reel}:${row}`
              const isActive = activePosKey.has(posKey)
              const src = getAssetUrl(providerBaseUrl, gameId, sym, symbolMap)

              return (
                <div
                  key={`${r}_${c}_${sym}`}
                  className={[
                    'relative overflow-hidden rounded-[18px] border bg-black/25',
                    'border-white/10',
                    isActive ? 'ring-2 ring-emerald-300/70 shadow-[0_0_42px_rgba(16,185,129,0.30)]' : '',
                    spinning ? 'animate-[cellPulse_0.16s_ease-in-out_infinite]' : ''
                  ].join(' ')}
                >
                  <div
                    className={[
                      'absolute inset-0',
                      spinning ? `animate-[reelBlur_${210 + reel * 26}ms_ease-in-out_infinite]` : ''
                    ].join(' ')}
                  />

                  {src ? (
                    <img
                      src={src}
                      alt={sym}
                      className={[
                        'relative z-10 h-full w-full object-contain',
                        // ✅ Symbols bigger: almost no padding
                        'p-[2px] sm:p-[3px] md:p-1',
                        spinning ? 'opacity-90 blur-[0.7px] scale-[1.06]' : 'opacity-100'
                      ].join(' ')}
                      draggable={false}
                    />
                  ) : (
                    <div className="relative z-10 flex h-full w-full items-center justify-center text-[11px] font-bold text-white/55">
                      {sym || '—'}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {activeWin ? (
          <div className="pointer-events-none absolute inset-0 z-30">
            <svg viewBox="0 0 1000 600" preserveAspectRatio="none" className="h-full w-full">
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                className="payline-draw"
                points={polylinePoints}
                fill="none"
                stroke="rgba(52,211,153,0.95)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                className="payline-flash"
                points={polylinePoints}
                fill="none"
                stroke="rgba(245,158,11,0.95)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : null}

        {/* optional FS tag only */}
        {fsActive ? (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-40 -translate-x-1/2">
            <div className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-[11px] font-extrabold text-amber-100">
              FREE SPINS • {fsRemaining}
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes reelBlur {
          0% { opacity: 0.06; backdrop-filter: blur(0px); }
          50% { opacity: 0.18; backdrop-filter: blur(2.4px); }
          100% { opacity: 0.06; backdrop-filter: blur(0px); }
        }
        @keyframes cellPulse {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-1px); }
          100% { transform: translateY(0px); }
        }
        .payline-draw {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: paylineDraw 420ms ease-out forwards;
          filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.45));
        }
        @keyframes paylineDraw { to { stroke-dashoffset: 0; } }
        .payline-flash {
          opacity: 0;
          animation: paylineFlash 720ms ease-in-out infinite;
          filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.55));
        }
        @keyframes paylineFlash {
          0% { opacity: 0; }
          20% { opacity: 0.95; }
          55% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}