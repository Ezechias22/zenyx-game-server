export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  rtp: number
  assets: {
    cover: string
    background: string
    symbols?: string[]
  }
}

async function getGames(): Promise<Game[]> {
  const res = await fetch(`${process.env.PROVIDER_BASE_URL}/v1/public/games`, {
    headers: {
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
    },
    cache: "no-store"
  })

  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : []
}

export default async function Lobby() {
  const games = await getGames()

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f1a",
        padding: "40px",
        color: "#fff"
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 24 }}>
        🎰 ZENYX CASINO
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: 18
        }}
      >
        {games.map((game) => (
          <a
            key={game.id}
            href={`/api/create-session?gameCode=${encodeURIComponent(game.id)}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "white",
              borderRadius: 14,
              overflow: "hidden",
              background: "#111827",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
            }}
          >
            <img
              src={`/api/assets?path=${encodeURIComponent(game.assets?.cover || "")}`}
              alt={game.name}
              style={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                display: "block"
              }}
            />

            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                {game.name}
              </div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                {game.kind} • RTP {Math.round((Number(game.rtp) || 0) * 100)}%
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}
