'use client'

import { useEffect, useMemo, useState } from 'react'

type Game = {
  id: string
  name: string
  cover?: string
}

function asGameArray(x: any): Game[] | null {
  if (Array.isArray(x)) return x
  if (x && typeof x === 'object' && Array.isArray(x.games)) return x.games
  return null
}

export default function Page() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError('')

        const r = await fetch('/api/games', { cache: 'no-store' })
        const j: any = await r.json()

        if (!r.ok) throw new Error(j?.error || 'Failed to load games')

        const list = asGameArray(j)
        if (!list) throw new Error('Invalid games response')

        if (!alive) return
        setGames(list)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? 'Invalid games response')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const hasGames = useMemo(() => games.length > 0, [games])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8">
      <div className="mb-6 text-center">
        <div className="text-3xl font-black tracking-tight text-white">ZENYX Casino</div>
        <div className="mt-1 text-sm text-white/60">
          Game Server • Provider Live • Production
        </div>
      </div>

      {error ? (
        <div className="mx-auto mb-6 w-full max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Loading games...
        </div>
      ) : null}

      {!loading && !error && !hasGames ? (
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          No games available.
        </div>
      ) : null}

      {!loading && hasGames ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {games.map((g) => (
            <a
              key={g.id}
              href={`/play?gameId=${encodeURIComponent(g.id)}`}
              className="group rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
            >
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-black/30">
                {g.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.cover}
                    alt={g.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                    No cover
                  </div>
                )}
              </div>
              <div className="mt-3 line-clamp-1 text-sm font-bold text-white">{g.name}</div>
              <div className="mt-1 text-xs text-white/50">{g.id}</div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}
