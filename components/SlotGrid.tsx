'use client'

import { useMemo } from 'react'
import PaylineOverlay, { ProviderWin } from '@/components/PaylineOverlay'

type Props = {
  grid: string[][] // 5x3 reel x row
  spinning: boolean
  // construit depuis catalog: key -> absoluteUrl
  symbolMap: Record<string, string>
  // wins renvoyés par provider: positions[{reel,row}]
  wins: ProviderWin[]
  // bonus info
  scattersCount?: number
  freeSpinsRemaining?: number
}

function clamp5x3(grid: string[][]): string[][] {
  const out = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ''))
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 3; row++) {
      out[reel][row] = grid?.[reel]?.[row] ?? ''
    }
  }
  return out
}

function normKey(v: any) {
  return String(v ?? '').trim()
}

function pickSymbolUrl(symbolMap: Record<string, string>, keyRaw: string): string | null {
  const k = normKey(keyRaw)
  if (!k) return null

  // exact
  if (symbolMap[k]) return symbolMap[k]

  // common variants
  const lower = k.toLowerCase()
  const upper = k.toUpperCase()
  if (symbolMap[lower]) return symbolMap[lower]
  if (symbolMap[upper]) return symbolMap[upper]

  // wild/scatter aliases
  if ((lower === 'w' || lower === 'wild') && (symbolMap['W'] || symbolMap['wild'])) return symbolMap['W'] ?? symbolMap['wild']
  if ((lower === 's' || lower === 'scatter') && (symbolMap['S'] || symbolMap['scatter'])) return symbolMap['S'] ?? symbolMap['scatter']

  return null
}

export default function SlotGrid({
  grid,
  spinning,
  symbolMap,
  wins,
  scattersCount = 0,
  freeSpinsRemaining = 0
}: Props) {
  const g = useMemo(() => clamp5x3(grid), [grid])
  const hasWins = wins?.length > 0
  const hasBonus = (freeSpinsRemaining ?? 0) > 0 || (scattersCount ?? 0) >= 3

  return (
    <div className="mx-auto w-full max-w-[min(96vw,900px)]">
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-[clamp(10px,2vw,16px)]">
          <div className="relative">
            {/* BONUS HEADER */}
            {hasBonus ? (
              <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-2xl border border-amber-300/25 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
                {freeSpinsRemaining > 0
                  ? `FREE SPINS • ${freeSpinsRemaining} LEFT`
                  : `SCATTER ×${scattersCount}`}
              </div>
            ) : null}

            <div className="grid grid-cols-5 gap-[clamp(8px,1.4vw,12px)]">
              {Array.from({ length: 5 }).map((_, reel) => (
                <div key={`reel_${reel}`} className="grid grid-rows-3 gap-[clamp(8px,1.4vw,12px)]">
                  {Array.from({ length: 3 }).map((_, row) => {
                    const key = g[reel][row]
                    const url = pickSymbolUrl(symbolMap, key)

                    return (
                      <div
                        key={`cell_${reel}_${row}`}
                        className={`relative aspect-square overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border bg-black/35 flex items-center justify-center transition-all duration-150 ${
                          hasWins ? 'border-white/12' : 'border-white/10'
                        }`}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={key}
                            className={`h-[82%] w-[82%] object-contain transition-all duration-150 ${
                              spinning ? 'scale-95 blur-[1.5px] opacity-90' : 'scale-100'
                            }`}
                            draggable={false}
                            loading="eager"
                            decoding="async"
                          />
                        ) : (
                          <div className="px-2 text-center text-[10px] font-bold text-white/30 leading-tight">
                            MISSING
                            <div className="text-white/25">{String(key)}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* ✅ Paylines overlay = wins provider */}
            <PaylineOverlay wins={wins || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
