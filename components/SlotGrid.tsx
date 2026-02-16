'use client'

import { useMemo } from 'react'
import PaylineOverlay from '@/components/PaylineOverlay'
import { PAYLINES_20 } from '@/constants/paylines'

export type SoundEvent =
  | { type: 'spin' }
  | { type: 'stop'; reelIndex: number }
  | { type: 'win' }
  | { type: 'click' }

type Props = {
  gameId: string
  providerBase: string
  grid: string[][] // 5x3 reel x row
  spinning: boolean

  // gagnants uniquement
  winningLines: number[] // indices
  onSound?: (e: SoundEvent) => void
}

function clamp5x3(grid: string[][]): string[][] {
  const out = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
  for (let r = 0; r < 5; r++) for (let y = 0; y < 3; y++) out[r][y] = grid?.[r]?.[y] ?? ''
  return out
}

export default function SlotGrid({
  gameId,
  providerBase,
  grid,
  spinning,
  winningLines,
  onSound
}: Props) {
  const g = useMemo(() => clamp5x3(grid), [grid])
  const hasWin = winningLines.length > 0

  const base = providerBase.replace(/\/$/, '')
  const symbolUrl = (sym: string) => `${base}/assets/${gameId}/symbols/${encodeURIComponent(sym)}.png`

  function isWinningCell(reel: number, row: number) {
    if (!hasWin) return false
    for (const li of winningLines) {
      if (PAYLINES_20[li]?.[reel] === row) return true
    }
    return false
  }

  return (
    <div className="mx-auto w-full max-w-[min(96vw,900px)]">
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-[clamp(10px,2vw,16px)]">
          <div className="relative">
            <div className="grid grid-cols-5 gap-[clamp(8px,1.4vw,12px)]">
              {Array.from({ length: 5 }).map((_, reel) => (
                <div key={`reel_${reel}`} className="grid grid-rows-3 gap-[clamp(8px,1.4vw,12px)]">
                  {Array.from({ length: 3 }).map((_, row) => {
                    const sym = g[reel][row]
                    const winCell = isWinningCell(reel, row)

                    return (
                      <div
                        key={`cell_${reel}_${row}`}
                        className={`relative aspect-square overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border bg-black/35 flex items-center justify-center transition-all duration-150 ${
                          winCell
                            ? 'border-emerald-400/40 shadow-[0_0_18px_rgba(34,197,94,0.35)]'
                            : 'border-white/10'
                        }`}
                      >
                        {sym ? (
                          <img
                            src={symbolUrl(sym)}
                            alt={sym}
                            className={`h-[82%] w-[82%] object-contain transition-all duration-150 ${
                              spinning ? 'scale-95 blur-[1.5px] opacity-90' : winCell ? 'scale-110' : 'scale-100'
                            }`}
                            draggable={false}
                            loading="eager"
                            decoding="async"
                          />
                        ) : (
                          <div className="text-white/20 text-xs font-semibold">•</div>
                        )}

                        {/* flash only on win */}
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${
                            winCell ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{
                            background:
                              'radial-gradient(circle at 50% 45%, rgba(34,197,94,0.18), transparent 60%)'
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* ✅ paylines ONLY on gains */}
            <PaylineOverlay winningLines={winningLines} />
          </div>
        </div>
      </div>

      {/* ✅ Controls ONLY if win (sinon rien) */}
      {hasWin ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold text-emerald-100">
            WIN LINES: {winningLines.map((i) => i + 1).join(', ')}
          </div>

          <button
            onClick={() => onSound?.({ type: 'click' })}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
          >
            OK
          </button>
        </div>
      ) : null}
    </div>
  )
}
