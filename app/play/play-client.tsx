"use client"

import { useMemo, useState } from "react"

type Props = {
  sessionId: string
  gameName: string
  kind: string
  backgroundUrl: string
  launchUrl: string
  symbols: string[]
}

type PlayResp = {
  win?: number
  balance?: number
  currency?: string
}

function n(x: any, fallback = 0) {
  const v = Number(x)
  return Number.isFinite(v) ? v : fallback
}

export default function PlayClient({
  sessionId,
  gameName,
  kind,
  backgroundUrl,
  launchUrl,
  symbols
}: Props) {
  const [bet, setBet] = useState(1)
  const [spinning, setSpinning] = useState(false)
  const [win, setWin] = useState(0)
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState("BRL")

  const iframeUrl = useMemo(() => {
    if (!launchUrl) return ""
    try {
      const u = new URL(launchUrl)
      if (u.host === window.location.host) return ""
      return launchUrl
    } catch {
      return ""
    }
  }, [launchUrl])

  async function onSpin() {
    if (spinning) return
    setSpinning(true)

    // 🔊 hooks sons (tu ajoutes toi-même)
    // playSound("/sounds/spin.mp3")

    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, bet })
      })

      const data: PlayResp = await res.json().catch(() => ({}))

      const w = n(data?.win, 0)
      const b = n(data?.balance, 0)
      const c = (data?.currency || "BRL").toString()

      setWin(w)
      setBalance(b)
      setCurrency(c)

      // if (w > 0) playSound("/sounds/win.mp3")
      // else playSound("/sounds/lose.mp3")
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
          ? `linear-gradient(rgba(0,0,0,0.70), rgba(0,0,0,0.86)), url(${backgroundUrl}) center/cover no-repeat`
          : "#0b0f1a",
        padding: 18
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 22 }}>ZENYX • {gameName}</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            {kind} • Session: <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/" style={btnGhost}>← Lobby</a>
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
            background: "rgba(17,24,39,0.70)",
            position: "relative"
          }}
        >
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
                  animation: spinning ? "zenyxShake .55s linear infinite" : "none"
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  padding: 18,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.75)"
                }}
              >
                <div>
                  <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 8 }}>
                    Game Stage
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    Iframe disponible uniquement si le provider fournit un <b>launchUrl</b> externe.
                  </div>

                  {symbols.length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      {symbols.slice(0, 8).map((p) => (
                        <img
                          key={p}
                          src={`/api/assets?path=${encodeURIComponent(p)}`}
                          alt="symbol"
                          style={{ width: 44, height: 44, objectFit: "contain", opacity: 0.92 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
