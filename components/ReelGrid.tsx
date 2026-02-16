'use client'

import { useMemo } from 'react'
import type { SymbolAsset } from '@/lib/types'

function safe3x5(grid: SymbolAsset[][] | undefined | null): SymbolAsset[][] {
  const out: SymbolAsset[][] = Array.from({ length: 3 }, (_, r) =>
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
  spinning
}: {
  grid: SymbolAsset[][]
  spinning: boolean
}) {
  const g = useMemo(() => safe3x5(grid), [grid])
  const cells = g.flat()

  return (
    <div className="mx-auto w-full max-w-[min(92vw,720px)]">
      <div
        className="grid gap-[clamp(8px,1.4vw,12px)]"
        style={{
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateColumns: 'repeat(5, 1fr)'
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={`${cell.id}_${i}`}
            className={`aspect-square rounded-[clamp(12px,1.6vw,18px)] border border-white/10 bg-black/30 overflow-hidden flex items-center justify-center ${
              spinning ? 'opacity-90' : 'opacity-100'
            }`}
          >
            {cell.src ? (
              <img
                src={cell.src}
                alt={cell.id}
                className={`w-full h-full object-contain p-2 transition-transform duration-300 ${
                  spinning ? 'scale-95' : 'scale-100'
                }`}
                draggable={false}
                onError={(e) => {
                  // fallback visible instead of hiding the element
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent && !parent.querySelector('[data-fallback]')) {
                    const d = document.createElement('div')
                    d.setAttribute('data-fallback', '1')
                    d.className = 'text-white/60 text-sm font-bold'
                    d.textContent = '?'
                    parent.appendChild(d)
                  }
                }}
              />
            ) : (
              <div className="text-white/10 text-xs font-semibold">•</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
