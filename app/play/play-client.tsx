"use client"

import { useEffect, useMemo, useState } from "react"

type Game = {
  id: string
  name: string
  kind: string
  assets?: { cover?: string; background?: string; symbols?: string[] }
}

type PlayResp = {
  provider?: string
  gameCode?: string
  kind?: string
  bet?: number
  win?: number
  nonce?: number
  balance?: number
  currency?: string
  // provider might wrap/extend fields; we ignore unknown safely
  [k: string]: unknown
}

function n(x: unknown, fallback = 0) {
  const v = Number(x)
  return Number.isFinite(v) ? v : fallback
}

export default function PlayClient({
  sessionId,
  initialGameCode
}: {
  sessionId: string
  initialGameCode: string
}) {
  const [games, setGames] = useState<Game[]>([])
  const [gameCode, setGameCode] = useState(initialGameCode || "")
  const [spinning, setSpinning] = useState(false)

  const [bet, setBet] = useState(1)
  const [win, setWin] = useState(0)
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState("BRL")

  useEffect(() => {
    let dead = false
    fetch("/api/games", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (dead) return
        const list = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : []
        setGames(list)
      })
      .catch(() => {})
    return () => {
      dead = true
    }
  }, [])

  const game = useMemo(() => {
    if (!gameCode) return undefined
    return games.find((g) => g.id === gameCode)
  }, [games, gameCode])

  const backgroundUrl = useMemo(() => {
    const p = game?.assets?.background
    return p ? `/api/assets?path=${encodeURIComponent(p)}` : ""
  }, [game])

  const symbols = useMemo(() => {
    const s = game?.assets?.symbols
    return Array.isArray(s) ? s : []
  }, [game])

  async function onSpin() {
    if (spinning) return
    setSpinning(true)

    // 🔊 SOUND HOOKS (tu ajoutes toi-même)
    // playSound("/sounds/spin.mp3")

    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, bet })
      })

      const data: PlayResp = await res.json().catch(() => ({}))

      // ✅ never render objects directly
      const w = n(data?.win, 0)
      const b = n(data?.balance, 0)
      const c = (data?.currency || "BRL").toString()

      setWin(w)
      setBalance(b)
      setCurrency(c)

      if (typeof data?.gameCode === "string" && data.gameCode) {
        setGameCode(data.gameCode)
      }

      // if (w > 0) playSound("/sounds/win.mp3")
    } finally {
      setTimeout(() => setSpinning(false), 350)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#fff",
        background: backgroundUrl
          ? `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.88)), url(${backgroundUrl}) center/cover no-repeat`
          : "radial-gradient(1200px 700px at 20% 0%, rgba(124,58,237,0.18), transparent 60%), #0b0f1a",
        padding: 18
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 22 }}>
            ZENYX • {game?.name || "PLAY"}
          </div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            {game?.kind ? `${game.kind} • ` : ""}
            Session: <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/" style={btnGhost}>
            ← Lobby
          </a>
          <button onClick={onSpin} disabled={spinning} style={btnPrimary}>
            {spinning ? "SPIN..." : "SPIN"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12
        }}
      >
        <div style={card}>
          <div style={label}>BET</div>
          <div style={value}>{bet}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {[1, 2, 5, 10].map((x) => (
              <button key={x} onClick={() => setBet(x)} style={pill(bet === x)}>
                {x}
              </button>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={label}>WIN</div>
          <div style={value}>{win}</div>
        </div>

        <div style={card}>
          <div style={label}>BALANCE</div>
          <div style={value}>
            {balance} <span style={{ opacity: 0.75, fontSize: 14 }}>{currency}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            background: "rgba(17,24,39,0.72)",
            position: "relative"
          }}
        >
          {/* ✅ animation stage */}
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              opacity: spinning ? 1 : 0,
              transition: "opacity .12s ease",
              background:
                "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.38), transparent 55%)",
              mixBlendMode: "screen"
            }}
          />

          <div style={{ width: "100%", aspectRatio: "16/9", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: 18
              }}
            >
              <div style={{ maxWidth: 720, opacity: 0.85 }}>
                <div style={{ fontWeight: 950, fontSize: 20 }}>GAME STAGE</div>
                <div style={{ fontSize: 13, marginTop: 8, opacity: 0.75 }}>
                  Ici tu peux brancher tes animations + sons. Le spin est live (provider /v1/public/play).
                </div>

                {symbols.length > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      gap: 10,
                      justifyContent: "center",
                      flexWrap: "wrap"
                    }}
                  >
                    {symbols.slice(0, 16).map((p) => (
                      <img
                        key={p}
                        src={`/api/assets?path=${encodeURIComponent(p)}`}
                        alt="symbol"
                        style={{
                          width: 46,
                          height: 46,
                          objectFit: "contain",
                          opacity: 0.95,
                          filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.55))"
                        }}
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* subtle reel motion */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.08,
                background:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 48px)",
                transform: spinning ? "translateX(-12px)" : "translateX(0px)",
                transition: "transform .25s ease"
              }}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

const btnGhost: React.CSSProperties = {
  textDecoration: "none",
  color: "#fff",
  opacity: 0.85,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontWeight: 900,
  fontSize: 13
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  background: "#7c3aed",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#fff",
  fontWeight: 950,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 10px 30px rgba(124,58,237,0.35)"
}

const card: React.CSSProperties = {
  background: "rgba(17,24,39,0.78)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14
}

const label: React.CSSProperties = {
  opacity: 0.7,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 0.7
}

const value: React.CSSProperties = {
  marginTop: 6,
  fontSize: 22,
  fontWeight: 950
}

const pill = (active: boolean): React.CSSProperties => ({
  padding: "7px 10px",
  borderRadius: 999,
  background: active ? "#7c3aed" : "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#fff",
  fontWeight: 950,
  fontSize: 12,
  cursor: "pointer"
})
