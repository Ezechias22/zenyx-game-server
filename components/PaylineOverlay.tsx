'use client'

import React, { useMemo } from 'react'

export type WinPosition = { reel: number; row: number }
export type ProviderWin = {
  // le provider peut renvoyer d’autres champs, on ne dépend que de positions
  positions: WinPosition[]
  // optionnel
  amount?: string | number
  lineIndex?: number
}

type Props = {
  wins: ProviderWin[]
  // taille logique: 1000x600, 5 reels, 3 rows
  showAll?: boolean // si tu veux un toggle plus tard
}

function pointFor(pos: WinPosition) {
  const x = (pos.reel / 4) * 1000
  const y = (pos.row / 2) * 600
  return `${x},${y}`
}

export default function PaylineOverlay({ wins }: Props) {
  const polylines = useMemo(() => {
    if (!Array.isArray(wins) || wins.length === 0) return []
    return wins
      .map((w) => (Array.isArray(w?.positions) ? w.positions : []))
      .filter((p) => p.length >= 2) // une ligne a au moins 2 points
      .map((positions) => positions.map(pointFor).join(' '))
  }, [wins])

  if (polylines.length === 0) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20"
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
    >
      {polylines.map((pts, i) => (
        <g key={i}>
          {/* glow */}
          <polyline
            points={pts}
            fill="none"
            stroke="rgba(255,215,0,0.28)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* core */}
          <polyline
            points={pts}
            fill="none"
            stroke="rgba(255,215,0,0.85)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
    </svg>
  )
}
