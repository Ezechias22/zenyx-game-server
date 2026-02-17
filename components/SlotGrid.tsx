'use client'

import { useMemo } from 'react'
import PaylineOverlay from '@/components/PaylineOverlay'
import { PAYLINES_20 } from '@/constants/paylines'

type Props = {
  gameId: string
  providerBase: string
  grid: string[][] // 5x3 reel x row
  spinning: boolean
  winningLines: number[] // indices (paylines gagnantes)
}

function clamp5x3(grid: string[][]): string[][] {
  const out = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
  for (let r = 0; r < 5; r++) for (let y = 0; y < 3; y++) out[r][y] = grid?.[r]?.[y] ?? ''
  return out
}

export default function SlotGrid({ gameId, providerBase, grid, spinning, winningLines }: Props) {
  const g = useMemo(() => clamp5x3(grid), [grid])
  const hasLineWin = winningLines.length > 0

  const base = providerBase.replace(/\/$/, '')
  const symbolUrl = (sym: string) => `${base}/assets/${gameId}/symbols/${encodeURIComponent(sym)}.png`

  // ✅ Scatter bonus detection (3+ anywhere)
  const scatterCells = useMemo(() => {
    const cells: Array<{ reel: number; row: number }> = []
    for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 3; row++) {
        if (g[reel][row] === 'S') cells.push({ reel, row })
      }
    }
    return cells
  }, [g])

  const scatterCount = scatterCells.length
  const hasScatterBonus = scatterCount >= 3

  function isWinningCell(reel: number, row: number) {
    if (!hasLineWin) return false
    for (const li of winningLines) {
      if (PAYLINES_20[li]?.[reel] === row) return true
    }
    return false
  }

  function isScatterCell(reel: number, row: number) {
    return g[reel][row] === 'S'
  }

  return (
    <div className="mx-auto w-full max-w-[min(96vw,900px)]">
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-[clamp(10px,2vw,16px)]">
          <div className="relative">
            {/* ✅ BONUS banner */}
            {hasScatterBonus ? (
              <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                BONUS TRIGGER • SCATTER ×{scatterCount}
              </div>
            ) : null}

            <div className="grid grid-cols-5 gap-[clamp(8px,1.4vw,12px)]">
              {Array.from({ length: 5 }).map((_, reel) => (
                <div key={`reel_${reel}`} className="grid grid-rows-3 gap-[clamp(8px,1.4vw,12px)]">
                  {Array.from({ length: 3 }).map((_, row) => {
                    const sym = g[reel][row]
                    const winCell = isWinningCell(reel, row)
                    const scCell = isScatterCell(reel, row)

                    return (
                      <div
                        key={`cell_${reel}_${row}`}
                        className={`relative aspect-square overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border bg-black/35 flex items-center justify-center transition-all duration-150 ${
                          winCell
                            ? 'border-emerald-400/40 shadow-[0_0_18px_rgba(34,197,94,0.35)]'
                            : scCell && hasScatterBonus
                              ? 'border-amber-300/40 shadow-[0_0_18px_rgba(245,158,11,0.28)]'
                              : 'border-white/10'
                        }`}
                      >
                        {sym ? (
                          <img
                            src={symbolUrl(sym)}
                            alt={sym}
                            className={`h-[82%] w-[82%] object-contain transition-all duration-150 ${
                              spinning ? 'scale-95 blur-[1.5px] opacity-90' : winCell || (scCell && hasScatterBonus) ? 'scale-110' : 'scale-100'
                            }`}
                            draggable={false}
                            loading="eager"
                            decoding="async"
                          />
                        ) : (
                          <div className="text-white/20 text-xs font-semibold">•</div>
                        )}

                        {/* win flash */}
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${
                            winCell ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{
                            background:
                              'radial-gradient(circle at 50% 45%, rgba(34,197,94,0.18), transparent 60%)'
                          }}
                        />

                        {/* scatter bonus flash */}
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${
                            scCell && hasScatterBonus ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{
                            background:
                              'radial-gradient(circle at 50% 45%, rgba(245,158,11,0.18), transparent 60%)'
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* ✅ paylines only on wins (as you requested) */}
            <PaylineOverlay winningLines={winningLines} />
          </div>
        </div>
      </div>

      {/* ✅ info bar for bonus (optional) */}
      {hasScatterBonus ? (
        <div className="mt-4 flex justify-center">
          <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-100">
            Scatter Bonus triggered (UI). If provider returns bonus details later, we’ll render them here.
          </div>
        </div>
      ) : null}
    </div>
  )
}
