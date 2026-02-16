'use client'

import { useMemo } from 'react'
import { PAYLINES_20 } from '@/constants/paylines'

type Props = {
  selectedLine: number
  showAllLines: boolean
  winningLines: number[] // indices
}

const W = 1000
const H = 600

function pointsFor(line: number[]): string {
  // columns = 5 => x = (i/4)*1000
  // rows = 3 => y = (row/2)*600
  return line
    .map((row, i) => {
      const x = (i / 4) * W
      const y = (row / 2) * H
      return `${x},${y}`
    })
    .join(' ')
}

export default function PaylineOverlay({ selectedLine, showAllLines, winningLines }: Props) {
  const set = useMemo(() => new Set(winningLines), [winningLines])

  const indices = useMemo(() => {
    if (showAllLines) return PAYLINES_20.map((_, i) => i)
    return [selectedLine]
  }, [selectedLine, showAllLines])

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        {/* soft glow */}
        <filter id="glowPurple" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glowGreen" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* draw effect */}
        <style>
          {`
            .zenyx-draw {
              stroke-dasharray: 2400;
              stroke-dashoffset: 2400;
              animation: zenyxDraw 420ms ease forwards;
            }
            @keyframes zenyxDraw {
              to { stroke-dashoffset: 0; }
            }
            .zenyx-fade {
              animation: zenyxFade 200ms ease;
            }
            @keyframes zenyxFade {
              from { opacity: 0.0; }
              to { opacity: 1; }
            }
          `}
        </style>
      </defs>

      {indices.map((idx) => {
        const isWin = set.has(idx)
        const isSelected = idx === selectedLine && !showAllLines

        // style tiers:
        // - winning: green + stronger width
        // - selected: purple + medium width
        // - all lines: purple but thinner
        const stroke = isWin ? 'rgba(34,197,94,0.95)' : 'rgba(139,92,246,0.85)'
        const strokeWidth = isWin ? 9 : isSelected ? 8 : 5
        const filter = isWin ? 'url(#glowGreen)' : 'url(#glowPurple)'
        const opacity = showAllLines ? (isWin ? 1 : 0.55) : 1

        return (
          <polyline
            key={idx}
            className="zenyx-draw zenyx-fade"
            points={pointsFor(PAYLINES_20[idx])}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={filter}
            opacity={opacity}
          />
        )
      })}
    </svg>
  )
}
