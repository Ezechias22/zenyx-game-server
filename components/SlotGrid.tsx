'use client'

import { useEffect, useMemo } from 'react'
import PaylineOverlay from '@/components/PaylineOverlay'
import { PAYLINES_20 } from '@/constants/paylines'

export type SoundEvent =
  | { type: 'spin' }
  | { type: 'stop'; reelIndex: number }
  | { type: 'win' }
  | { type: 'lineChange'; lineIndex: number }
  | { type: 'click' }

type Props = {
  gameId: string
  providerBase: string

  // provider grid: 5 reels x 3 rows => grid[reel][row]
  grid: string[][]

  spinning: boolean

  selectedLine: number
  setSelectedLine: (v: number) => void

  showAllLines: boolean
  setShowAllLines: (v: boolean) => void

  winningLines: number[] // indices
  onSound?: (e: SoundEvent) => void
}

function clampGrid5x3(grid: string[][]): string[][] {
  const out = Array.from({ length: 5 }, (_, r) => Array.from({ length: 3 }, (_, c) => ''))
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 3; row++) {
      const v = grid?.[reel]?.[row]
      out[reel][row] = typeof v === 'string' ? v : ''
    }
  }
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
  const g = useMemo(() => clampGrid5x3(grid), [grid])

  // 🔊 emit reel stop events (fast stagger)
  useEffect(() => {
    if (!spinning) return
    onSound?.({ type: 'spin' })

    const timers: any[] = []
    const stops = [220, 300, 380, 460, 540] // ms
    stops.forEach((t, i) => {
      timers.push(setTimeout(() => onSound?.({ type: 'stop', reelIndex: i }), t))
    })
    return () => timers.forEach(clearTimeout)
  }, [spinning, onSound])

  useEffect(() => {
    if (winningLines.length > 0) onSound?.({ type: 'win' })
  }, [winningLines, onSound])

  const winSet = useMemo(() => new Set(winningLines), [winningLines])

  // cells are shown as UI rows x cols, but source is g[reel][row]
  // To render columns visually as 5 columns and 3 rows:
  // We will render 5 columns, inside each column render 3 cells (top -> bottom).
  function symbolUrl(symbol: string) {
    const base = providerBase.replace(/\/$/, '')
    return `${base}/assets/${gameId}/symbols/${encodeURIComponent(symbol)}.png`
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

  // highlight cells that belong to winning lines (flash)
  function isWinningCell(reel: number, row: number): boolean {
    if (winningLines.length === 0) return false
    for (const li of winningLines) {
      if (PAYLINES_20[li]?.[reel] === row) return true
    }
    return false
  }

  // selected line mask for subtle focus when not showAll
  function isSelectedCell(reel: number, row: number): boolean {
    if (showAllLines) return false
    return PAYLINES_20[selectedLine]?.[reel] === row
  }

  return (
    <div className="mx-auto w-full max-w-[min(92vw,900px)]">
      <div className="relative">
        {/* GRID */}
        <div className="grid grid-cols-5 gap-[clamp(8px,1.4vw,12px)] rounded-2xl border border-white/10 bg-black/40 p-[clamp(10px,2vw,16px)]">
          {Array.from({ length: 5 }).map((_, reel) => (
            <div key={`reel_${reel}`} className="grid grid-rows-3 gap-[clamp(8px,1.4vw,12px)]">
              {Array.from({ length: 3 }).map((_, row) => {
                const sym = g[reel][row] || ''
                const winCell = isWinningCell(reel, row)
                const selCell = isSelectedCell(reel, row)

                return (
                  <div
                    key={`cell_${reel}_${row}`}
                    className={`relative aspect-square overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border flex items-center justify-center bg-black/35 transition-all duration-150 ${
                      winCell
                        ? 'border-emerald-400/40 shadow-[0_0_18px_rgba(34,197,94,0.35)]'
                        : selCell
                          ? 'border-violet-400/35 shadow-[0_0_16px_rgba(139,92,246,0.22)]'
                          : 'border-white/10'
                    } ${spinning ? 'opacity-95' : 'opacity-100'}`}
                  >
                    {sym ? (
                      <img
                        src={symbolUrl(sym)}
                        alt={sym}
                        className={`h-[82%] w-[82%] object-contain transition-transform duration-150 ${
                          spinning ? 'scale-95 blur-[1.4px]' : winCell ? 'scale-110 blur-0' : 'scale-100 blur-0'
                        }`}
                        draggable={false}
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.opacity = '0.2'
                        }}
                      />
                    ) : (
                      <div className="text-white/15 text-xs font-semibold">•</div>
                    )}

                    {/* flash overlay for winning cells */}
                    <div
                      className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
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

        {/* PAYLINES OVERLAY */}
        <PaylineOverlay selectedLine={selectedLine} showAllLines={showAllLines} winningLines={winningLines} />
      </div>

      {/* CONTROLS */}
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
