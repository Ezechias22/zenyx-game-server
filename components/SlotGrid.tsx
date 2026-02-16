'use client'

import PaylineOverlay from '@/components/PaylineOverlay'
import { PAYLINES_20 } from '@/constants/paylines'
import { useMemo } from 'react'

export type SoundEvent =
  | { type: 'spin' }
  | { type: 'stop'; reelIndex: number }
  | { type: 'win' }
  | { type: 'lineChange'; lineIndex: number }
  | { type: 'click' }

type Props = {
  gameId: string
  providerBase: string
  grid: string[][] // 5x3 reel x row
  spinning: boolean

  selectedLine: number
  setSelectedLine: (v: number) => void

  showAllLines: boolean
  setShowAllLines: (v: boolean) => void

  winningLines: number[]
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
  selectedLine,
  setSelectedLine,
  showAllLines,
  setShowAllLines,
  winningLines,
  onSound
}: Props) {
  const g = useMemo(() => clamp5x3(grid), [grid])
  const winSet = useMemo(() => new Set(winningLines), [winningLines])

  const base = providerBase.replace(/\/$/, '')
  const symbolUrl = (sym: string) => `${base}/assets/${gameId}/symbols/${encodeURIComponent(sym)}.png`

  function isWinningCell(reel: number, row: number) {
    for (const li of winningLines) {
      if (PAYLINES_20[li]?.[reel] === row) return true
    }
    return false
  }

  function prevLine() {
    onSound?.({ type: 'click' })
    setShowAllLines(false)
    const next = selectedLine === 0 ? PAYLINES_20.length - 1 : selectedLine - 1
    setSelectedLine(next)
    onSound?.({ type: 'lineChange', lineIndex: next })
  }

  function nextLine() {
    onSound?.({ type: 'click' })
    setShowAllLines(false)
    const next = (selectedLine + 1) % PAYLINES_20.length
    setSelectedLine(next)
    onSound?.({ type: 'lineChange', lineIndex: next })
  }

  function toggleAll() {
    onSound?.({ type: 'click' })
    setShowAllLines(!showAllLines)
  }

  return (
    <div className="mx-auto w-full max-w-[min(92vw,900px)]">
      {/* ✅ IMPORTANT: overlay must cover ONLY the grid area */}
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-[clamp(10px,2vw,16px)]">
          <div className="relative">
            {/* grid itself */}
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
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* overlay covers grid block */}
            <PaylineOverlay selectedLine={selectedLine} showAllLines={showAllLines} winningLines={winningLines} />
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={prevLine}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
        >
          Prev Line
        </button>

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80">
          {showAllLines ? (
            <>All Lines {winningLines.length ? `• Wins: ${winningLines.length}` : ''}</>
          ) : (
            <>
              Line {selectedLine + 1}
              {winSet.has(selectedLine) ? <span className="ml-2 text-emerald-300">WIN</span> : null}
            </>
          )}
        </div>

        <button
          onClick={nextLine}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
        >
          Next Line
        </button>

        <button
          onClick={toggleAll}
          className="rounded-xl border border-violet-400/30 bg-violet-600/70 px-4 py-2 text-xs font-extrabold text-white hover:bg-violet-600"
        >
          {showAllLines ? 'Single Line' : 'Show All'}
        </button>
      </div>
    </div>
  )
}
