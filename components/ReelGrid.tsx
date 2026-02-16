'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SymbolAsset } from '@/lib/types'

type Cell = SymbolAsset

function safe3x5(grid: Cell[][] | undefined | null): Cell[][] {
  const out: Cell[][] = Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({ id: `EMPTY_${r}_${c}`, src: '' }))
  )
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

export default function ReelGrid({
  grid,
  spinning,
  paylineMask // optional: same shape 3x5 boolean
}: {
  grid: SymbolAsset[][]
  spinning: boolean
  paylineMask?: boolean[][]
}) {
  const g = useMemo(() => safe3x5(grid), [grid])

  // columns [5][3]
  const cols = useMemo(() => {
    const c: Cell[][] = Array.from({ length: 5 }, () => [])
    for (let r = 0; r < 3; r++) for (let x = 0; x < 5; x++) c[x][r] = g[r][x]
    return c
  }, [g])

  // stagger stops (fast + pro)
  const [stopFlags, setStopFlags] = useState<boolean[]>([true, true, true, true, true])

  useEffect(() => {
    if (!spinning) {
      setStopFlags([true, true, true, true, true])
      return
    }
    // while spinning -> all reels are "moving"
    setStopFlags([false, false, false, false, false])

    const timers: any[] = []
    // fast stagger (ms) => casino feel, not slow
    const stops = [220, 300, 380, 460, 540]
    stops.forEach((t, i) => {
      timers.push(
        setTimeout(() => {
          setStopFlags(prev => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, t)
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [spinning])

  return (
    <div className="mx-auto w-full max-w-[min(92vw,760px)]">
      <div className="grid grid-cols-5 gap-[clamp(8px,1.4vw,12px)]">
        {cols.map((col, colIdx) => {
          const stopped = stopFlags[colIdx]
          const blur = spinning && !stopped

          return (
            <div
              key={`reel_${colIdx}`}
              className="relative overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border border-white/10 bg-black/30"
            >
              <div className="grid grid-rows-3">
                {col.map((cell, rowIdx) => {
                  const mask = paylineMask?.[rowIdx]?.[colIdx] ?? false
                  return (
                    <div
                      key={`${cell.id}_${rowIdx}`}
                      className={`relative flex items-center justify-center aspect-square ${
                        spinning && !stopped
                          ? 'animate-[zenyxReelShake_120ms_linear_infinite]'
                          : 'animate-none'
                      }`}
                    >
                      {/* Payline highlight */}
                      <div
                        className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
                          mask ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          boxShadow: mask ? 'inset 0 0 0 2px rgba(120,90,255,0.55)' : undefined
                        }}
                      />

                      {cell.src ? (
                        <img
                          src={cell.src}
                          alt={cell.id}
                          draggable={false}
                          className={`h-[82%] w-[82%] object-contain transition-all duration-150 ${
                            blur ? 'scale-95 blur-[1.5px] opacity-90' : 'scale-100 blur-0 opacity-100'
                          }`}
                          onError={e => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {/* glossy overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/6 via-transparent to-transparent" />
            </div>
          )
        })}
      </div>

      <style jsx global>{`
        @keyframes zenyxReelShake {
          0% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
