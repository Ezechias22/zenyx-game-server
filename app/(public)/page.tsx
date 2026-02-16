'use client'

import { useEffect, useState } from 'react'
import GameCard from '@/components/GameCard'
import type { Game } from '@/lib/types'

export default function Lobby() {
  const [games, setGames] = useState<Game[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/games', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load games')

        const list: Game[] = Array.isArray(json?.games) ? json.games : json
        if (alive) setGames(list)
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="pb-24">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight">Lobby</div>
          <div className="mt-1 text-sm text-white/60">Covers & catalog depuis provider (prod)</div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Loading games…
        </div>
      ) : null}

      {!loading && !error && games.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          No games returned by provider.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {games.map(g => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </div>
  )
}
