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
  const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL!
  const PUBLIC_TOKEN = process.env.PUBLIC_TOKEN!
  const OPERATOR_KEY = process.env.OPERATOR_KEY!

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/games`, {
    cache: "no-store",
    headers: {
      "x-public-token": PUBLIC_TOKEN,
      "x-operator-key": OPERATOR_KEY,
    },
  })

  if (!res.ok) {
    throw new Error("Failed to load games")
  }

  return res.json()
}

export default async function LobbyPage() {
  const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL!
  const games = await getGames()

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>🎰 ZENYX CASINO</h1>

      <div style={styles.grid}>
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/play?gameCode=${game.id}`}
            style={styles.card}
          >
            <img
              src={`${PROVIDER_BASE_URL}${game.assets.cover}`}
              alt={game.name}
              style={styles.cover}
            />

            <div style={styles.info}>
              <h3 style={styles.name}>{game.name}</h3>
              <p style={styles.meta}>
                {game.kind} • RTP {game.rtp}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "40px 20px",
    background: "linear-gradient(180deg,#0b0f1c,#0e1428)",
    color: "white",
    fontFamily: "system-ui, sans-serif",
  },

  title: {
    textAlign: "center",
    marginBottom: "40px",
    fontSize: "28px",
    fontWeight: 700,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  card: {
    textDecoration: "none",
    background: "#121a33",
    borderRadius: "16px",
    overflow: "hidden",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },

  cover: {
    width: "100%",
    aspectRatio: "1/1",
    objectFit: "cover",
    display: "block",
  },

  info: {
    padding: "14px",
  },

  name: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
  },

  meta: {
    margin: "6px 0 0 0",
    fontSize: "13px",
    opacity: 0.7,
  },
}
