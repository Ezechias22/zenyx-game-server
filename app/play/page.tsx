import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  assets?: {
    cover?: string
    background?: string
    symbols?: string[]
  }
}

type PlayResponse = {
  gameCode?: string
  kind?: string
  bet?: number
  win?: number
  balance?: number
  currency?: string
}

async function fetchGames(): Promise<Game[]> {
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

async function spin(sessionId: string, bet: number): Promise<PlayResponse> {
  const res = await fetch(`${process.env.PROVIDER_BASE_URL}/v1/public/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
    },
    body: JSON.stringify({ sessionId, bet }),
    cache: "no-store"
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // renvoyer une réponse "safe" (pas d'objet à afficher)
    return {
      win: 0,
      balance: 0,
      currency: "BRL",
      gameCode: data?.gameCode
    }
  }

  return data
}

function safeNumber(x: any, fallback = 0) {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}

export default async function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string; bet?: string; spin?: string }
}) {
  const sessionId =
    searchParams.sessionId && searchParams.sessionId.length >= 10
      ? searchParams.sessionId
      : null

  if (!sessionId) redirect("/")

  const bet = Math.max(1, safeNumber(searchParams.bet, 1))

  // Charger les jeux pour background + info UI
  const games = await fetchGames()

  // On essaie de trouver le gameCode depuis la dernière réponse play (si spin),
  // sinon on laisse sans background.
  let result: PlayResponse | null = null
  if (searchParams.spin === "1") {
    result = await spin(sessionId, bet)
  }

  const gameCode = (result?.gameCode || "").toString()
  const game = gameCode ? games.find((g) => g.id === gameCode) : undefined

  const bgPath = game?.assets?.background || ""
  const backgroundUrl = bgPath
    ? `/api/assets?path=${encodeURIComponent(bgPath)}`
    : ""

  const win = safeNumber(result?.win, 0)
  const balance = safeNumber(result?.balance, 0)
  const currency = (result?.currency || "BRL").toString()

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#fff",
        background: backgroundUrl
          ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(${backgroundUrl}) center/cover no-repeat`
          : "#0b0f1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div
        style={{
          width: "min(820px, 100%)",
          background: "rgba(17,24,39,0.78)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>ZENYX • PLAY</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 6 }}>
              Session: <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
            </div>
          </div>

          <a
            href="/"
            style={{
              alignSelf: "center",
              textDecoration: "none",
              color: "#fff",
              opacity: 0.8
            }}
          >
            ← Lobby
          </a>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.8, fontWeight: 700 }}>Bet</div>

          <a
            href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=1`}
            style={pill}
          >
            1
          </a>
          <a
            href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=2`}
            style={pill}
          >
            2
          </a>
          <a
            href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=5`}
            style={pill}
          >
            5
          </a>
          <a
            href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=10`}
            style={pill}
          >
            10
          </a>

          <div style={{ flex: 1 }} />

          <a
            href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=${bet}&spin=1`}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              background: "#7c3aed",
              color: "#fff",
              fontWeight: 900,
              textDecoration: "none",
              letterSpacing: 0.5
            }}
          >
            SPIN
          </a>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12
          }}
        >
          <div style={statCard}>
            <div style={statLabel}>WIN</div>
            <div style={statValue}>{win}</div>
          </div>

          <div style={statCard}>
            <div style={statLabel}>BALANCE</div>
            <div style={statValue}>
              {balance} <span style={{ opacity: 0.8, fontSize: 14 }}>{currency}</span>
            </div>
          </div>

          <div style={statCard}>
            <div style={statLabel}>BET</div>
            <div style={statValue}>{bet}</div>
          </div>
        </div>

        {!result && (
          <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13 }}>
            Clique sur <b>SPIN</b> pour lancer un tour.
          </div>
        )}
      </div>
    </main>
  )
}

const pill: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13
}

const statCard: React.CSSProperties = {
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 14
}

const statLabel: React.CSSProperties = {
  opacity: 0.7,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.6
}

const statValue: React.CSSProperties = {
  marginTop: 6,
  fontSize: 22,
  fontWeight: 900
}
