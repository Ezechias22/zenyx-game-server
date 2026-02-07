'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Card } from '../components/ui'

type ProviderGame = {
  id: string
  kind: string
  rtp?: number
  name?: string
}

type GameVm = {
  code: string
  kind: string
  rtp?: number
  title: string
}

function titleFromId(id: string) {
  return id
    .split('_')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}

export default function AdminDashboard() {
  const [gamesRaw, setGamesRaw] = useState<ProviderGame[]>([])
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<string>('(no request yet)')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/games', { cache: 'no-store' })
        const text = await res.text()

        setDebug(`status=${res.status}\n\n${text.slice(0, 5000)}`)

        let j: any = null
        try {
          j = text ? JSON.parse(text) : null
        } catch {
          j = null
        }

        if (!res.ok) throw new Error(j?.error || `Erreur /api/games (status ${res.status})`)

        const list: ProviderGame[] = Array.isArray(j) ? j : Array.isArray(j?.games) ? j.games : []
        if (alive) setGamesRaw(list)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Erreur')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  const games = useMemo<GameVm[]>(() => {
    return (gamesRaw || [])
      .filter((g) => g && typeof g.id === 'string')
      .map((g) => ({
        code: g.id,
        kind: g.kind || 'UNKNOWN',
        rtp: g.rtp,
        title: g.name || titleFromId(g.id),
      }))
      .filter((g) => g.kind === 'SLOT')
  }, [gamesRaw])

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">Console jeux</div>
          <div className="text-sm text-white/70">Lister les jeux et lancer une session.</div>
        </div>

        <Card className="mt-6 p-4">
          <div className="text-xs text-white/60">Debug /api/games</div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-[12px] text-white/80">{debug}</pre>
        </Card>

        {error ? (
          <Card className="mt-4 p-4 border-rose-500/30">
            <div className="text-sm text-rose-200">{error}</div>
          </Card>
        ) : null}

        {loading ? (
          <Card className="mt-4 p-4">
            <div className="text-sm text-white/70">Chargement...</div>
          </Card>
        ) : null}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {games.map((g) => (
            <Card key={g.code} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold">{g.title}</div>
                  <div className="text-xs text-white/60">{g.code}</div>
                  {typeof g.rtp === 'number' ? (
                    <div className="mt-1 text-[11px] text-white/60">RTP: {g.rtp}</div>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    window.location.href = `/play?gameCode=${encodeURIComponent(g.code)}`
                  }}
                >
                  Ouvrir
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {!loading && !error && games.length === 0 ? (
          <Card className="mt-6 p-4">
            <div className="text-sm text-white/70">
              Aucun jeu SLOT affiché. Vérifie la réponse /api/games dans le bloc Debug ci-dessus.
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
