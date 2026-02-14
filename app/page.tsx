import { fetchGames } from "@/lib/provider"

type Game = {
  id: string
  name: string
  kind: string
  rtp: number | string
  assets?: { cover?: string; background?: string }
}

export const dynamic = "force-dynamic"

function normalizeBaseUrl(u: string) {
  let base = (u || "").replace(/\/+$/, "")
  base = base.replace(/\/v1$/, "")
  return base
}

function toAbsoluteUrl(base: string, path?: string) {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (!path.startsWith("/")) return `${base}/${path}`
  return `${base}${path}`
}

export default async function Home() {
  const providerBaseUrl = normalizeBaseUrl(process.env.PROVIDER_BASE_URL || "")

  const data: any = await fetchGames()
  const games: Game[] = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : []

  return (
    <main style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 30 }}>🎰 ZENYX GAMES</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 20
        }}
      >
        {games.map((game) => {
          const coverUrl = toAbsoluteUrl(providerBaseUrl, game.assets?.cover)

          return (
            <div
              key={game.id}
              style={{
                background: "#111827",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
              }}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={game.name}
                  style={{ width: "100%", height: 180, objectFit: "cover" }}
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : (
                <div style={{ height: 180, background: "#0b1220" }} />
              )}

              <div style={{ padding: 16 }}>
                <h3 style={{ margin: "0 0 8px 0" }}>{game.name}</h3>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  <div>Type: {game.kind}</div>
                  <div>RTP: {String(game.rtp)}</div>
                </div>

                <a
                  href={`/play?gameCode=${encodeURIComponent(game.id)}`}
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "8px 14px",
                    background: "#7c3aed",
                    color: "white",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: 600
                  }}
                >
                  Play
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
