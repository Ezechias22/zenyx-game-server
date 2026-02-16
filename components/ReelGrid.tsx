'use client'

import type { SymbolAsset } from '@/lib/types'

function safe3x5(grid: SymbolAsset[][] | undefined | null) {
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
  const g = safe3x5(grid)
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
            className={`aspect-square rounded-[clamp(12px,1.6vw,18px)] border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden ${
              spinning ? 'animate-pulse' : ''
            }`}
          >
            {cell.src ? (
              <img
                src={cell.src}
                alt={cell.id}
                className="w-full h-full object-contain p-2"
                draggable={false}
                onError={e => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
