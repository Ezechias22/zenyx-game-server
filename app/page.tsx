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
  const res = await fetch(
    `${process.env.PROVIDER_BASE_URL}/v1/public/games`,
    {
      headers: {
        "x-public-token": process.env.PUBLIC_TOKEN!,
        "x-operator-key": process.env.OPERATOR_KEY!
      },
      cache: "no-store"
    }
  )

  if (!res.ok) return []

  return res.json()
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
      <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
        🎰 ZENYX GAMES
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: "20px"
        }}
      >
        {games.map((game) => (
          <a
            key={game.id}
            href={`/api/create-session?gameCode=${game.id}`}
            style={{
              textDecoration: "none",
              color: "white",
              background: "#111827",
              borderRadius: "12px",
              overflow: "hidden",
              display: "block"
            }}
          >
            <img
              src={`/api/assets?path=${encodeURIComponent(
                game.assets.cover
              )}`}
              alt={game.name}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover"
              }}
            />

            <div style={{ padding: "15px" }}>
              <div style={{ fontWeight: 700 }}>{game.name}</div>
              <div style={{ opacity: 0.6, fontSize: "14px" }}>
                {game.kind} — RTP {(game.rtp * 100).toFixed(2)}%
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}
