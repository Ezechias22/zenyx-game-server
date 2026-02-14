export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  rtp?: number
  assets?: {
    cover?: string
    background?: string
    symbols?: string[]
  }
}

async function getGames(): Promise<Game[]> {
  const base = (process.env.PROVIDER_BASE_URL || "").replace(/\/+$/, "")
  const res = await fetch(`${base}/v1/public/games`, {
    headers: {
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
    },
    cache: "no-store"
  })

  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const list = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : []
  return list
}

export default async function Lobby() {
  const games = await getGames()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "ZENYX Casino"

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f1a",
        color: "#fff",
        padding: 28
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 30, letterSpacing: 0.2 }}>🎰 {appName}</div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>
            Sélectionne un jeu pour démarrer une session.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16
        }}
      >
        {games.map((g) => {
          const coverPath = g.assets?.cover || ""
          const coverUrl = coverPath ? `/api/assets?path=${encodeURIComponent(coverPath)}` : ""
          const rtpPct = typeof g.rtp === "number" ? `${Math.round(g.rtp * 100)}%` : "—"

          return (
            <a
              key={g.id}
              href={`/api/create-session?gameCode=${encodeURIComponent(g.id)}`}
              style={{
                display: "block",
                textDecoration: "none",
                color: "#fff",
                background: "rgba(17,24,39,0.85)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                transform: "translateZ(0)"
              }}
            >
              <div style={{ position: "relative" }}>
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={g.name}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      display: "block"
                    }}
                  />
                ) : (
                  <div style={{ height: 180, background: "rgba(255,255,255,0.04)" }} />
                )}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 100%)"
                  }}
                />
              </div>

              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{g.name}</div>
                <div style={{ opacity: 0.72, fontSize: 13, marginTop: 6 }}>
                  {g.kind} • RTP {rtpPct}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "#7c3aed",
                    fontWeight: 900,
                    fontSize: 13
                  }}
                >
                  Play →
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </main>
  )
}
