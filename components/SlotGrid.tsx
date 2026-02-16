'use client'

import { useState } from 'react'
import PaylineOverlay from './PaylineOverlay'
import { PAYLINES_20 } from '@/constants/paylines'

type Props = {
  grid: string[][] // grid[reel][row]
  providerBase: string
  gameId: string
}

export default function SlotGrid({
  grid,
  providerBase,
  gameId
}: Props) {

  const [selectedLine, setSelectedLine] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const nextLine = () => {
    setShowAll(false)
    setSelectedLine(prev => (prev + 1) % PAYLINES_20.length)
  }

  const prevLine = () => {
    setShowAll(false)
    setSelectedLine(prev =>
      prev === 0 ? PAYLINES_20.length - 1 : prev - 1
    )
  }

  return (
    <div className="w-full max-w-[900px] mx-auto">

      {/* GRID CONTAINER */}
      <div className="relative">

        {/* SLOT GRID */}
        <div className="grid grid-cols-5 gap-2 bg-black/40 p-4 rounded-2xl">
          {grid.map((column, reelIndex) =>
            column.map((symbol, rowIndex) => (
              <div
                key={`${reelIndex}_${rowIndex}`}
                className="aspect-square bg-black/50 rounded-xl flex items-center justify-center border border-white/10"
              >
                <img
                  src={`${providerBase}/assets/${gameId}/symbols/${symbol}.png`}
                  alt={symbol}
                  className="w-[80%] h-[80%] object-contain"
                  draggable={false}
                />
              </div>
            ))
          )}
        </div>

        {/* PAYLINE SVG OVERLAY */}
        <PaylineOverlay
          selectedLine={selectedLine}
          showAll={showAll}
        />
      </div>

      {/* CONTROLS */}
      <div className="flex justify-center items-center gap-4 mt-4">

        <button
          onClick={prevLine}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20"
        >
          Prev Line
        </button>

        <div className="text-sm font-semibold">
          {showAll ? 'All Lines' : `Line ${selectedLine + 1}`}
        </div>

        <button
          onClick={nextLine}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20"
        >
          Next Line
        </button>

        <button
          onClick={() => setShowAll(prev => !prev)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700"
        >
          {showAll ? 'Single Line' : 'Show All'}
        </button>

      </div>
    </div>
  )
}
