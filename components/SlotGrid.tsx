'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import PaylineOverlay, { ProviderWin } from '@/components/PaylineOverlay'

type Props = {
  grid: string[][] // provider: [reel][row] => 5x3
  spinning: boolean
  symbolMap: Record<string, string> // from catalog assets.symbols (best-effort)
  wins: ProviderWin[]
  scattersCount?: number
  freeSpinsRemaining?: number

  // ✅ needed for fallback url building
  providerBaseUrl: string
  gameId: string
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

function normKey(v: unknown) {
  return String(v ?? '').trim()
}

function buildCandidates(base: string, gameId: string, keyRaw: string): string[] {
  const b = base.replace(/\/$/, '')
  const key = normKey(keyRaw)
  if (!key) return []

  const lower = key.toLowerCase()
  const upper = key.toUpperCase()

  // provider can have either "W.png" or "wild.png", "S.png" or "scatter.png"
  const wildAliases = key === 'W' || lower === 'wild' ? ['W', 'wild'] : []
  const scatterAliases = key === 'S' || lower === 'scatter' ? ['S', 'scatter'] : []

  const variants = Array.from(
    new Set([key, lower, upper, ...wildAliases, ...scatterAliases])
  )

  return variants.map((k) => `${b}/assets/${gameId}/symbols/${k}.png`)
}

export default function SlotGrid({
  grid,
  spinning,
  symbolMap,
  wins,
  scattersCount = 0,
  freeSpinsRemaining = 0,
  providerBaseUrl,
  gameId
}: Props) {
  const g = useMemo(() => clamp5x3(grid), [grid])

  // cache: key -> resolvedUrl (or empty string if not found)
  const resolvedRef = useRef<Record<string, string>>({})
  const [tick, setTick] = useState(0) // trigger re-render when cache updates

  // pre-resolve visible keys on grid (fast, no fetch, just candidate priority)
  useEffect(() => {
    const next: Record<string, string> = { ...resolvedRef.current }
    let changed = false

    for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 3; row++) {
        const key = normKey(g[reel][row])
        if (!key) continue
        if (next[key] !== undefined) continue

        // 1) try from symbolMap (catalog)
        const mapHit =
          symbolMap[key] ??
          symbolMap[key.toLowerCase()] ??
          symbolMap[key.toUpperCase()]

        if (mapHit) {
          next[key] = mapHit
          changed = true
          continue
        }

        // 2) fallback to provider convention (no hardcode: just candidate urls)
        const candidates = buildCandidates(providerBaseUrl, gameId, key)
        next[key] = candidates[0] ?? '' // start with first candidate; onError we rotate
        changed = true
      }
    }

    if (changed) {
      resolvedRef.current = next
      setTick((t) => t + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, symbolMap, providerBaseUrl, gameId])

  const hasWins = wins?.length > 0
  const hasBonus = freeSpinsRemaining > 0 || scattersCount >= 3

  return (
    <div className="mx-auto w-full max-w-[min(96vw,900px)]">
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-[clamp(10px,2vw,16px)]">
          <div className="relative">
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
                    const key = normKey(g[reel][row])
                    const url = key ? resolvedRef.current[key] : ''

                    return (
                      <div
                        key={`cell_${reel}_${row}`}
                        className={`relative aspect-square overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border bg-black/35 flex items-center justify-center transition-all duration-150 ${
                          hasWins ? 'border-white/12' : 'border-white/10'
                        }`}
                      >
                        {url ? (
                          <img
                            key={`${key}_${tick}`} // re-render when cache changes
                            src={url}
                            alt={key}
                            className={`h-[82%] w-[82%] object-contain transition-all duration-150 ${
                              spinning ? 'scale-95 blur-[1.5px] opacity-90' : 'scale-100'
                            }`}
                            draggable={false}
                            loading="eager"
                            decoding="async"
                            onError={() => {
                              // rotate candidates if first fails
                              const candidates = buildCandidates(providerBaseUrl, gameId, key)
                              const current = resolvedRef.current[key]
                              const idx = candidates.findIndex((c) => c === current)
                              const nextUrl = candidates[idx + 1] ?? '' // if none -> ''
                              resolvedRef.current = { ...resolvedRef.current, [key]: nextUrl }
                              setTick((t) => t + 1)
                            }}
                          />
                        ) : (
                          <div className="px-2 text-center text-[10px] font-bold text-white/30 leading-tight">
                            MISSING
                            <div className="text-white/25">{key || '-'}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* ✅ draw only provider wins */}
            <PaylineOverlay wins={wins || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
