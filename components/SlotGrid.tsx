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
    for (let row = 0; row < 3; row++) {
      out[row][reel] = keyOf(grid5x3?.[reel]?.[row] ?? '')
    }
  }
  return out
}

function getAssetUrl(base: string, gameId: string, symbolKey: string, symbolMap: SymbolMap): string {
  const key = keyOf(symbolKey)
  if (!key) return ''

  // 1) symbolMap (catalog) - le plus fiable (gère wild.png vs W.png)
  const direct = symbolMap[key]
  if (direct) return direct

  // 2) fallback standard
  const b = base.replace(/\/$/, '')
  return `${b}/assets/${gameId}/symbols/${encodeURIComponent(key)}.png`
}

function winPositionsToPolyline(win: ProviderWin) {
  // viewBox 1000x600, reels=5, rows=3
  // x = i/4 *1000, y = row/2 *600
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
  const rows3x5 = useMemo(() => to3x5(grid), [grid])

  // only winning lines from provider (wins)
  const winLines = useMemo(() => wins.filter((w) => w.positions?.length >= 2), [wins])

  const [selectedWinIdx, setSelectedWinIdx] = useState(0)
  const cycleRef = useRef<number | null>(null)

  // when new wins arrive -> reset and start cycling
  useEffect(() => {
    setSelectedWinIdx(0)
    if (cycleRef.current) {
      window.clearInterval(cycleRef.current)
      cycleRef.current = null
    }

    if (winLines.length <= 1) return

    // auto-cycle only on winning lines
    cycleRef.current = window.setInterval(() => {
      setSelectedWinIdx((x) => (x + 1) % winLines.length)
    }, 900)

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

  // highlight set of winning positions (for glow)
  const activePosKey = useMemo(() => {
    const s = new Set<string>()
    if (!activeWin) return s
    for (const p of activeWin.positions) s.add(`${p.reel}:${p.row}`)
    return s
  }, [activeWin])

  const polylinePoints = activeWin ? winPositionsToPolyline(activeWin) : ''

  return (
    <div className="mx-auto w-full">
      {/* Responsive wrapper: mobile first */}
      <div className="mx-auto w-full max-w-[760px]">
        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-3 md:p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          {/* GRID */}
          <div className="grid grid-cols-5 gap-2 md:gap-3">
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
                      'relative aspect-square overflow-hidden rounded-2xl border bg-black/20',
                      'border-white/10',
                      isActive ? 'ring-2 ring-emerald-300/60 shadow-[0_0_35px_rgba(16,185,129,0.28)]' : '',
                      spinning ? 'animate-[cellPulse_0.22s_ease-in-out_infinite]' : ''
                    ].join(' ')}
                  >
                    {/* spin animation layer */}
                    <div
                      className={[
                        'absolute inset-0',
                        spinning ? 'animate-[reelBlur_0.25s_ease-in-out_infinite]' : ''
                      ].join(' ')}
                    />

                    {src ? (
                      <img
                        src={src}
                        alt={sym}
                        className={[
                          'relative z-10 h-full w-full object-contain p-2 md:p-3',
                          spinning ? 'opacity-90 blur-[0.6px]' : 'opacity-100'
                        ].join(' ')}
                        draggable={false}
                      />
                    ) : (
                      <div className="relative z-10 flex h-full w-full items-center justify-center text-[10px] font-bold text-white/45">
                        {sym || '—'}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* PAYLINE OVERLAY (only when there is a win line) */}
          {activeWin ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <svg
                viewBox="0 0 1000 600"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                {/* glow under */}
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* main line (draw effect) */}
                <polyline
                  className="payline-draw"
                  points={polylinePoints}
                  fill="none"
                  stroke="rgba(52,211,153,0.95)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* flash */}
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

          {/* bottom small HUD (wins only) */}
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/60">
            <div className="font-semibold">
              {winLines.length > 0 ? `WIN LINES: ${winLines.length}` : 'NO WIN'}
            </div>
            <div className="flex items-center gap-2">
              {fsActive ? (
                <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-1 font-extrabold text-amber-100">
                  FREE SPINS • {fsRemaining}
                </span>
              ) : null}
              {winLines.length > 1 ? (
                <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2 py-1 font-extrabold text-emerald-100">
                  LINE {selectedWinIdx + 1}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes reelBlur {
          0% { opacity: 0.08; backdrop-filter: blur(0px); }
          50% { opacity: 0.16; backdrop-filter: blur(2px); }
          100% { opacity: 0.08; backdrop-filter: blur(0px); }
        }
        @keyframes cellPulse {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-1px); }
          100% { transform: translateY(0px); }
        }

        /* Payline draw */
        .payline-draw {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: paylineDraw 420ms ease-out forwards;
          filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.45));
        }
        @keyframes paylineDraw {
          to { stroke-dashoffset: 0; }
        }

        /* Flash */
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
