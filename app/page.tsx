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
  // retire trailing slash + retire /v1 si jamais il est présent
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

function normalizeGames(payload: any): Game[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.games)) return payload.games
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export default async function Home() {
  const providerBaseUrl = normalizeBaseUrl(process.env.PROVIDER_BASE_URL || "")

  const payload: any = await fetchGames()
  const games = normalizeGames(payload)

  return (
    <main style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>🎰 ZENYX GAMES</h1>
      <div style={{ opacity: 0.75, marginBottom: 22 }}>
        Games: <b>{games.length}</b>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 20
        }}
      >
        {games.map((game) => {
          const coverUrl = toAbsoluteUrl(providerBaseUrl, game.assets?.cover)
          const backgroundUrl = toAbsoluteUrl(providerBaseUrl, game.assets?.background)

          return (
            <div
              key={game.id}
              style={{
                background: "#111827",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
              }}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={game.name}
                  style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ height: 180, background: "#0b1220" }} />
              )}

              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  {game.name}
                </div>

                <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.5 }}>
                  <div>
                    Type: <b>{game.kind}</b>
                  </div>
                  <div>
                    RTP: <b>{String(game.rtp)}</b>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <a
                    href={`/play?gameCode=${encodeURIComponent(game.id)}`}
                    style={{
                      display: "inline-block",
                      padding: "9px 14px",
                      background: "#7c3aed",
                      color: "white",
                      borderRadius: 10,
                      textDecoration: "none",
                      fontWeight: 700
                    }}
                  >
                    Play
                  </a>

                  {backgroundUrl ? (
                    <a
                      href={backgroundUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "9px 14px",
                        background: "#0b1220",
                        color: "white",
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 600,
                        opacity: 0.9
                      }}
                    >
                      Background
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
