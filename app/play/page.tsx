import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SessionResp = {
  sessionId?: string
  launchUrl?: string
  ttlSec?: number
}

type PlayResp = {
  win?: number
  balance?: number
  currency?: string
  gameCode?: string
  kind?: string
}

async function spinProvider(sessionId: string, bet: number): Promise<PlayResp> {
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
  if (!res.ok) return { win: 0, balance: 0, currency: "BRL" }
  return data
}

async function getSessionInfo(sessionId: string): Promise<SessionResp | null> {
  return { sessionId }
}

function n(x: any, fallback = 0) {
  const v = Number(x)
  return Number.isFinite(v) ? v : fallback
}

export default async function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string; bet?: string; spin?: string; launchUrl?: string }
}) {
  const sessionId =
    searchParams.sessionId && searchParams.sessionId.length >= 10
      ? searchParams.sessionId
      : null

  if (!sessionId) redirect("/")

  const bet = Math.max(1, n(searchParams.bet, 1))

  const session = await getSessionInfo(sessionId)

  let result: PlayResp | null = null
  const spinning = searchParams.spin === "1"

  if (spinning) {
    result = await spinProvider(sessionId, bet)
  }

  const win = n(result?.win, 0)
  const balance = n(result?.balance, 0)
  const currency = (result?.currency || "BRL").toString()

  // ✅ launchUrl typed now
  const iframeUrl = searchParams.launchUrl || session?.launchUrl || ""

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f1a",
        color: "#fff",
        padding: 20
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>ZENYX • PLAY</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Session: <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/" style={linkBtn}>
            ← Lobby
          </a>

          <a
            href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=${bet}&spin=1${
              iframeUrl ? `&launchUrl=${encodeURIComponent(iframeUrl)}` : ""
            }`}
            style={{
              ...primaryBtn,
              transform: spinning ? "scale(1.02)" : "scale(1)"
            }}
          >
            SPIN
          </a>
        </div>
      </div>

      {/* HUD */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 14
        }}
      >
        <div style={statCard}>
          <div style={statLabel}>BET</div>
          <div style={statValue}>{bet}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=1${iframeUrl ? `&launchUrl=${encodeURIComponent(iframeUrl)}` : ""}`} style={pill}>1</a>
            <a href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=2${iframeUrl ? `&launchUrl=${encodeURIComponent(iframeUrl)}` : ""}`} style={pill}>2</a>
            <a href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=5${iframeUrl ? `&launchUrl=${encodeURIComponent(iframeUrl)}` : ""}`} style={pill}>5</a>
            <a href={`/play?sessionId=${encodeURIComponent(sessionId)}&bet=10${iframeUrl ? `&launchUrl=${encodeURIComponent(iframeUrl)}` : ""}`} style={pill}>10</a>
          </div>
        </div>

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
      </div>

      {/* GAME STAGE */}
      <div
        style={{
          position: "relative",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25))"
        }}
      >
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            opacity: spinning ? 1 : 0,
            transition: "opacity .15s ease",
            background:
              "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.35), transparent 55%)",
            mixBlendMode: "screen"
          }}
        />

        <div style={{ width: "100%", aspectRatio: "16 / 9", position: "relative" }}>
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              title="ZENYX Game"
              allow="autoplay; fullscreen"
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                display: "block",
                animation: spinning ? "zenyxShake 0.6s linear infinite" : "none"
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                color: "rgba(255,255,255,0.75)",
                padding: 20,
                textAlign: "center"
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
                  Iframe désactivé
                </div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  Le provider doit renvoyer <b>launchUrl</b> dans la session.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes zenyxShake {
          0% { transform: translate(0px, 0px); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); }
          60% { transform: translate(-1px, 0px); }
          80% { transform: translate(1px, 1px); }
          100% { transform: translate(0px, 0px); }
        }
      `}</style>
    </main>
  )
}

const linkBtn: React.CSSProperties = {
  textDecoration: "none",
  color: "#fff",
  opacity: 0.8,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontWeight: 800,
  fontSize: 13
}

const primaryBtn: React.CSSProperties = {
  textDecoration: "none",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 12,
  background: "#7c3aed",
  fontWeight: 900,
  fontSize: 14,
  boxShadow: "0 10px 30px rgba(124,58,237,0.35)"
}

const statCard: React.CSSProperties = {
  background: "rgba(17,24,39,0.78)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14
}

const statLabel: React.CSSProperties = {
  opacity: 0.7,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 0.7
}

const statValue: React.CSSProperties = {
  marginTop: 6,
  fontSize: 22,
  fontWeight: 900
}

const pill: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 12
}
