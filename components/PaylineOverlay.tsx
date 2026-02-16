'use client'

import { PAYLINES_20 } from '@/constants/paylines'

type Props = {
  selectedLine: number
  showAllLines: boolean
  winningLines: number[] // indices
}

const W = 1000
const H = 600

function pointsFor(line: number[]): string {
  // ✅ use cell CENTERS:
  // cols=5 => centerX = (i+0.5)/5 * W
  // rows=3 => centerY = (row+0.5)/3 * H
  return line
    .map((row, i) => {
      const x = ((i + 0.5) / 5) * W
      const y = ((row + 0.5) / 3) * H
      return `${x},${y}`
    })
    .join(' ')
}

export default function PaylineOverlay({ selectedLine, showAllLines, winningLines }: Props) {
  const winSet = new Set(winningLines)

  const indices = showAllLines ? PAYLINES_20.map((_, i) => i) : [selectedLine]

  return (
    <svg
      className="absolute inset-0 z-20 pointer-events-none"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="glowPurple" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

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
            animation: zenyxDraw 380ms ease forwards;
          }
          @keyframes zenyxDraw {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </defs>

      {indices.map((idx) => {
        const isWin = winSet.has(idx)

        return (
          <polyline
            key={idx}
            className="zenyx-draw"
            points={pointsFor(PAYLINES_20[idx])}
            fill="none"
            stroke={isWin ? 'rgba(34,197,94,0.95)' : 'rgba(139,92,246,0.9)'}
            strokeWidth={isWin ? 9 : 7}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={showAllLines ? (isWin ? 1 : 0.45) : 1}
            filter={isWin ? 'url(#glowGreen)' : 'url(#glowPurple)'}
          />
        )
      })}
    </svg>
  )
}
