'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Game = {
  id: string
  name: string
  cover: string
}

export default function HomePage() {
  const router = useRouter()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/games', { cache: 'no-store' })
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json?.error || 'Failed to load games')
        }

        if (!alive) return

        if (!Array.isArray(json?.games)) {
          throw new Error('Invalid games response')
        }

        setGames(json.games)
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Unknown error')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [])

  function openGame(gameId: string) {
    router.push(`/play?gameId=${encodeURIComponent(gameId)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-8">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            ZENYX Casino
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Game Server • Provider Live • Production
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-white/50">
            Loading games...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Games Grid */}
        {!loading && !error && (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns:
                'repeat(auto-fit, minmax(clamp(220px, 25vw, 260px), 1fr))'
            }}
          >
            {games.map((game) => (
              <div
                key={game.id}
                onClick={() => openGame(game.id)}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition-all duration-300 hover:border-white/30 hover:scale-[1.03]"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                  {game.cover ? (
                    <img
                      src={game.cover}
                      alt={game.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      draggable={false}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : null}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>

                <div className="p-4">
                  <div className="text-sm font-semibold tracking-wide">
                    {game.name}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    Click to play
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
