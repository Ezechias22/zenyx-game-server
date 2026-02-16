'use client'

import { useMemo, useState } from 'react'
import type { SymbolAsset } from '@/lib/types'

type Cell = SymbolAsset

function emptyCell(r: number, c: number): Cell {
  return { id: `EMPTY_${r}_${c}`, src: '' }
}

function safe3x5(grid: Cell[][] | undefined | null): Cell[][] {
  const out: Cell[][] = Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => emptyCell(r, c))
  )

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = grid?.[r]?.[c]
      if (cell && typeof cell === 'object') {
        out[r][c] = {
          id: typeof cell.id === 'string' && cell.id ? cell.id : `CELL_${r}_${c}`,
          src: typeof cell.src === 'string' ? cell.src : ''
        }
      }
    }
  }
  return out
}

function keyFromId(id: string): string {
  // id pattern from normalize: `${KEY}_${r}_${c}`
  const parts = id.split('_')
  if (!parts.length) return ''
  // KEY can contain digits like "10" or "EG1" or "W"
  // for "10_0_1" -> ["10","0","1"] OK
  // for "EG1_2_4" -> ["EG1","2","4"] OK
  return parts[0] ?? ''
}

export default function ReelGrid({
  grid,
  spinning
}: {
  grid: SymbolAsset[][]
  spinning: boolean
}) {
  const g = useMemo(() => safe3x5(grid), [grid])

  // Track which images failed (show key)
  const [failed, setFailed] = useState<Record<string, true>>({})

  return (
    <div className="mx-auto w-full max-w-[min(92vw,720px)]">
      <div
        className={`grid gap-[clamp(8px,1.4vw,12px)] ${
          spinning ? 'animate-[zenyxShake_650ms_ease-in-out_1]' : ''
        }`}
        style={{
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateColumns: 'repeat(5, 1fr)'
        }}
      >
        {g.flat().map((cell, idx) => {
          const key = keyFromId(cell.id) || '?'
          const isFailed = !!failed[cell.id]
          const hasImg = !!cell.src && !isFailed

          return (
            <div
              key={`${cell.id}_${idx}`}
              className={`relative aspect-square overflow-hidden rounded-[clamp(12px,1.6vw,18px)] border bg-black/30 flex items-center justify-center ${
                spinning ? 'border-white/20 shadow-[0_0_18px_rgba(120,90,255,0.20)]' : 'border-white/10'
              }`}
            >
              {hasImg ? (
                <img
                  src={cell.src}
                  alt={key}
                  className={`w-full h-full object-contain p-[clamp(6px,1.2vw,10px)] transition-transform duration-300 ${
                    spinning ? 'scale-95' : 'scale-100'
                  }`}
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  onError={() => {
                    setFailed(prev => ({ ...prev, [cell.id]: true }))
                  }}
                />
              ) : (
                <div className="text-white/70 font-extrabold text-[clamp(12px,2vw,18px)]">
                  {cell.src ? key : '•'}
                </div>
              )}

              {/* subtle highlight */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
            </div>
          )
        })}
      </div>

      {/* Keyframes (Tailwind inline) */}
      <style jsx global>{`
        @keyframes zenyxShake {
          0% { transform: translateY(0); }
          20% { transform: translateY(-2px); }
          40% { transform: translateY(2px); }
          60% { transform: translateY(-1px); }
          80% { transform: translateY(1px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
