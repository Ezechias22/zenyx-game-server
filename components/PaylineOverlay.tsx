'use client'

import { PAYLINES_20 } from '@/constants/paylines'

export default function PaylineOverlay({
  selectedLine,
  showAll
}: {
  selectedLine: number
  showAll: boolean
}) {

  const width = 1000
  const height = 600

  const getPoints = (line: number[]) => {
    return line.map((row, reelIndex) => {
      const x = (reelIndex / 4) * width
      const y = (row / 2) * height
      return `${x},${y}`
    }).join(' ')
  }

  const linesToDraw = showAll
    ? PAYLINES_20
    : [PAYLINES_20[selectedLine]]

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {linesToDraw.map((line, idx) => (
        <polyline
          key={idx}
          points={getPoints(line)}
          fill="none"
          stroke="rgba(139,92,246,0.9)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.8))'
          }}
        />
      ))}
    </svg>
  )
}
