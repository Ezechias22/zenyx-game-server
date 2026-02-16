'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SymbolAsset } from '@/lib/types'

type Cell = SymbolAsset

function makeEmpty(r: number, c: number): Cell {
  return { id: `EMPTY_${r}_${c}`, src: '' }
}

function toSafe3x5(grid: Cell[][] | undefined | null): Cell[][] {
  const out: Cell[][] = Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => {
      const cell = grid?.[r]?.[c]
      if (cell && typeof cell === 'object') {
        const id = typeof cell.id === 'string' && cell.id ? cell.id : `CELL_${r}_${c}`
        const src = typeof cell.src === 'string' ? cell.src : ''
        return { id, src }
      }
      return makeEmpty(r, c)
    })
  )
  return out
}

function stripForColumn(col: Cell[]) {
  const base = col.length ? col : [makeEmpty(0, 0), makeEmpty(1, 0), makeEmpty(2, 0)]
  // repeat to create a strip
  return [...base, ...base, ...base, ...base]
}

export default function ReelGrid({
  grid,
  spinning
}: {
  grid: SymbolAsset[][]
  spinning: boolean
}) {
  const safeGrid = useMemo(() => toSafe3x5(grid), [grid])

  // columns [5][3]
  const cols = useMemo(() => {
    const c: Cell[][] = Array.from({ length: 5 }, () => [])
    for (let r = 0; r < 3; r++) for (let x = 0; x < 5; x++) c[x][r] = safeGrid[r][x]
    return c
  }, [safeGrid])

  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!spinning) return
    const t = setInterval(() => setTick(v => v + 1), 60)
    return () => clearInterval(t)
  }, [spinning])

  return (
    <div className="mx-auto w-full max-w-[min(92vw,720px)]">
      <div className="grid grid-cols-5 gap-[clamp(8px,1.4vw,12px)]">
        {cols.map((col, colIdx) => {
          const strip = stripForColumn(col)

          // speed differs per column for casino feel
          const speed = 18 + colIdx * 3
          const offset = spinning ? (tick * speed) % (3 * 96) : 0

          return (
            <div
              key={`col_${colIdx}`}
              className="relative overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border border-white/10 bg-black/30"
              style={{
                // Keep 3 visible cells tall based on column width
                height: 'calc((min(92vw,720px) - 4*12px) / 5 * 3 + 0px)'
              }}
            >
              <div
                className="will-change-transform"
                style={{
                  transform: spinning ? `translateY(-${offset}px)` : 'translateY(0)',
                  transition: spinning ? 'none' : 'transform 240ms ease-out'
                }}
              >
                {strip.map((cell, i) => (
                  <div
                    key={`${cell.id}_${i}`}
                    className="flex items-center justify-center"
                    style={{ height: 96 }}
                  >
                    {cell.src ? (
                      <img
                        src={cell.src}
                        alt={cell.id}
                        className="h-[80%] w-[80%] object-contain"
                        draggable={false}
                        // If image 404, just hide it (no broken icon)
                        onError={e => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Visual separators (3 rows) */}
              <div className="pointer-events-none absolute inset-0 grid grid-rows-3">
                <div className="border-b border-white/5" />
                <div className="border-b border-white/5" />
                <div />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
