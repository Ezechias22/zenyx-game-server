'use client'

import { PAYLINES_20 } from '@/constants/paylines'

type Props = {
  winningLines: number[] // indices
}

const W = 1000
const H = 600

function pointsFor(line: number[]): string {
  // centers
  return line
    .map((row, i) => {
      const x = ((i + 0.5) / 5) * W
      const y = ((row + 0.5) / 3) * H
      return `${x},${y}`
    })
    .join(' ')
}

export default function PaylineOverlay({ winningLines }: Props) {
  if (!winningLines || winningLines.length === 0) return null

  return (
    <svg
      className="absolute inset-0 z-20 pointer-events-none"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="glowGreen" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <style>{`
          .zenyx-draw {
            stroke-dasharray: 2400;
            stroke-dashoffset: 2400;
            animation: zenyxDraw 360ms ease forwards;
          }
          @keyframes zenyxDraw {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </defs>

      {winningLines.map((idx) => (
        <polyline
          key={idx}
          className="zenyx-draw"
          points={pointsFor(PAYLINES_20[idx])}
          fill="none"
          stroke="rgba(34,197,94,0.95)"
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowGreen)"
          opacity={1}
        />
      ))}
    </svg>
  )
}
