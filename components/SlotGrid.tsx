'use client'

import { useMemo } from 'react'
import PaylineOverlay from '@/components/PaylineOverlay'
import { PAYLINES_20 } from '@/constants/paylines'

type Props = {
  gameId: string
  providerBase: string
  grid: string[][] // 5x3 reel x row
  spinning: boolean
  winningLines: number[]
}

const WILD = 'W'

function clamp5x3(grid: string[][]): string[][] {
  const out = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 3; row++) {
      out[reel][row] = grid?.[reel]?.[row] ?? ''
    }
  }
  return out
}

function normalizeKey(v: any): string {
  return String(v ?? '').trim()
}

function isScatterKey(v: string): boolean {
  const u = v.toUpperCase()
  return u === 'S' || u === 'SC' || u === 'SCATTER'
}

export default function SlotGrid({
  gameId,
  providerBase,
  grid,
  spinning,
  winningLines
}: Props) {
  const g = useMemo(() => clamp5x3(grid), [grid])

  const hasLineWin = winningLines.length > 0

  const base = providerBase.replace(/\/$/, '')
  const symbolUrl = (sym: string) =>
    `${base}/assets/${gameId}/symbols/${encodeURIComponent(sym)}.png`

  // ✅ Count scatters
  const scatterCount = useMemo(() => {
    let c = 0
    for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 3; row++) {
        const k = normalizeKey(g[reel][row])
        if (isScatterKey(k)) c++
      }
    }
    return c
  }, [g])

  const hasScatterBonus = scatterCount >= 3

  function isWinningCell(reel: number, row: number) {
    if (!hasLineWin) return false
    for (const li of winningLines) {
      if (PAYLINES_20[li]?.[reel] === row) return true
    }
    return false
  }

  function isScatterCell(reel: number, row: number) {
    return isScatterKey(normalizeKey(g[reel][row]))
  }

  return (
    <div className="mx-auto w-full max-w-[min(96vw,900px)]">
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-[clamp(10px,2vw,16px)]">
          <div className="relative">

            {/* 🔥 BONUS BANNER */}
            {hasScatterBonus && (
              <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
                BONUS TRIGGER • SCATTER ×{scatterCount}
              </div>
            )}

            <div className="grid grid-cols-5 gap-[clamp(8px,1.4vw,12px)]">
              {Array.from({ length: 5 }).map((_, reel) => (
                <div
                  key={`reel_${reel}`}
                  className="grid grid-rows-3 gap-[clamp(8px,1.4vw,12px)]"
                >
                  {Array.from({ length: 3 }).map((_, row) => {
                    const rawKey = g[reel][row]
                    const sym = normalizeKey(rawKey)
                    const winCell = isWinningCell(reel, row)
                    const scatterCell = isScatterCell(reel, row)

                    return (
                      <div
                        key={`cell_${reel}_${row}`}
                        className={`relative aspect-square overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border bg-black/35 flex items-center justify-center transition-all duration-200 ${
                          winCell
                            ? 'border-emerald-400/40 shadow-[0_0_18px_rgba(34,197,94,0.35)]'
                            : scatterCell && hasScatterBonus
                              ? 'border-amber-300/40 shadow-[0_0_18px_rgba(245,158,11,0.28)]'
                              : 'border-white/10'
                        }`}
                      >
                        {sym ? (
                          <img
                            src={symbolUrl(sym)}
                            alt={sym}
                            className={`h-[82%] w-[82%] object-contain transition-all duration-200 ${
                              spinning
                                ? 'scale-95 blur-[1.5px] opacity-90'
                                : winCell || (scatterCell && hasScatterBonus)
                                  ? 'scale-110'
                                  : 'scale-100'
                            }`}
                            draggable={false}
                            loading="eager"
                            decoding="async"
                          />
                        ) : (
                          <div className="text-white/20 text-xs font-semibold">•</div>
                        )}

                        {/* Payline win glow */}
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
                            winCell ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{
                            background:
                              'radial-gradient(circle at 50% 45%, rgba(34,197,94,0.18), transparent 60%)'
                          }}
                        />

                        {/* Scatter glow */}
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
                            scatterCell && hasScatterBonus ? 'opacity-100' : 'opacity-0'
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

            {/* ✅ Paylines overlay only if win */}
            <PaylineOverlay winningLines={winningLines} />
          </div>
        </div>
      </div>

      {/* BONUS INFO BAR */}
      {hasScatterBonus && (
        <div className="mt-4 flex justify-center">
          <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-100">
            Scatter Bonus Triggered (3+)
          </div>
        </div>
      )}
    </div>
  )
}
