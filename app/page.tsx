import Link from "next/link"

export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  rtp: number
  assets: {
    cover: string
  }
}

async function getGames(): Promise<Game[]> {
  const res = await fetch(
    `${process.env.PROVIDER_BASE_URL}/v1/public/games`,
    {
      headers: {
        "x-public-token": process.env.PUBLIC_TOKEN!,
        "x-operator-key": process.env.OPERATOR_KEY!,
      },
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error("Failed to load games")
  }

  return res.json()
}

export default async function Lobby() {
  const games = await getGames()

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        padding: "40px",
      }}
    >
      <h1 style={{ color: "white", marginBottom: "30px" }}>
        🎰 ZENYX CASINO
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/play?gameCode=${game.id}`}
            style={{
              textDecoration: "none",
              background: "#121a2f",
              borderRadius: "12px",
              padding: "15px",
              color: "white",
              transition: "0.2s",
            }}
          >
            <img
              src={`${process.env.PROVIDER_BASE_URL}${game.assets.cover}`}
              style={{
                width: "100%",
                borderRadius: "8px",
                marginBottom: "10px",
              }}
            />

            <div>
              <strong>{game.name}</strong>
              <div style={{ opacity: 0.6 }}>
                RTP {game.rtp}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
