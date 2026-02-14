export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  rtp?: number
  volatility?: string
  ui?: { aspectRatio?: string; width?: number; height?: number }
  assets?: { cover?: string; background?: string; symbols?: string[] }
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

export default async function LobbyPage() {
  const base = (process.env.PROVIDER_BASE_URL || "").replace(/\/+$/, "")
  const games = await getGames()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "ZENYX Casino"

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 700px at 20% 0%, rgba(124,58,237,0.18), transparent 60%), #0b0f1a",
        color: "#fff",
        padding: 28
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 30 }}>🎰 {appName}</div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>
            Lobby production • covers + symbols préchargés
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
          const cover = g.assets?.cover ? `${base}${g.assets.cover}` : ""
          const symbols = Array.isArray(g.assets?.symbols) ? g.assets!.symbols! : []

          const rtpPct =
            typeof g.rtp === "number" && Number.isFinite(g.rtp) ? `${Math.round(g.rtp * 100)}%` : "—"

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
                boxShadow: "0 18px 50px rgba(0,0,0,0.45)"
              }}
            >
              {/* ✅ Preload symbols (hidden) */}
              {symbols.slice(0, 20).map((p) => (
                <link key={p} rel="preload" as="image" href={`${base}${p}`} />
              ))}

              <div style={{ position: "relative" }}>
                {cover ? (
                  <img
                    src={cover}
                    alt={g.name}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
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
                    background: "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.75) 100%)"
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
