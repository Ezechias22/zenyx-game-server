import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  assets?: {
    cover?: string
    background?: string
  }
}

async function fetchGames(): Promise<Game[]> {
  const base = process.env.PROVIDER_BASE_URL!
  const res = await fetch(`${base}/v1/public/games`, {
    headers: {
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
    },
    cache: "no-store"
  })

  if (!res.ok) throw new Error("Failed to load games")

  const data = await res.json()
  return Array.isArray(data) ? data : data.games || []
}

async function createSession(gameCode: string) {
  const base = process.env.PROVIDER_BASE_URL!

  const res = await fetch(`${base}/v1/public/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
    },
    body: JSON.stringify({
      gameCode,
      playerExternalId: "player_demo_123",
      currency: "BRL"
    })
  })

  if (!res.ok) throw new Error("Session failed")

  return res.json()
}

export default async function Lobby({
  searchParams
}: {
  searchParams?: { start?: string }
}) {
  if (searchParams?.start) {
    const session = await createSession(searchParams.start)
    redirect(`/play?sessionId=${session.sessionId}`)
  }

  const games = await fetchGames()
  const base = process.env.PROVIDER_BASE_URL!.replace(/\/+$/, "")

  return (
    <main style={styles.wrapper}>
      <h1 style={styles.title}>ZENYX CASINO</h1>

      <div style={styles.grid}>
        {games.map((game) => {
          const cover = `${base}${game.assets?.cover || ""}`

          return (
            <a
              key={game.id}
              href={`/?start=${game.id}`}
              style={styles.card}
            >
              <img
                src={cover}
                alt={game.name}
                style={styles.image}
              />
              <div style={styles.overlay}>
                <span>{game.name}</span>
              </div>
            </a>
          )
        })}
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    background: "#0b0f1a",
    padding: "40px"
  },
  title: {
    color: "#fff",
    marginBottom: "30px",
    fontSize: "32px",
    fontWeight: 800
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: "20px"
  },
  card: {
    position: "relative",
    borderRadius: "14px",
    overflow: "hidden",
    textDecoration: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    transition: "transform 0.2s ease"
  },
  image: {
    width: "100%",
    height: "160px",
    objectFit: "cover",
    display: "block"
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: "12px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
    color: "#fff",
    fontWeight: 600
  }
}
