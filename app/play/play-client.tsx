"use client"

import { useState } from "react"

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
  backgroundStyle
}: {
  sessionId: string
  backgroundStyle: string
}) {
  const [spinning, setSpinning] = useState(false)
  const [win, setWin] = useState(0)
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState("BRL")

  async function onSpin() {
    if (spinning) return
    setSpinning(true)

    // 🔊 hook son (tu ajoutes toi-même)
    // playSound("/sounds/spin.mp3")

    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, bet: 1 })
      })

      const data: PlayResp = await res.json().catch(() => ({}))

      const w = n(data?.win, 0)
      const b = n(data?.balance, 0)
      const c = (data?.currency || "BRL").toString()

      setWin(w)
      setBalance(b)
      setCurrency(c)

      // 🔊 hooks sons
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
        background: backgroundStyle,
        padding: 18
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 22 }}>ZENYX • PLAY</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Session: <span style={{ fontFamily: "monospace" }}>{sessionId}</span>
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
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12
        }}
      >
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
            display: "grid",
            placeItems: "center",
            width: "100%",
            aspectRatio: "16/9"
          }}
        >
          <div style={{ textAlign: "center", opacity: 0.75 }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Game Stage</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Le provider rend l’UI via <b>/v1/launch</b> (iframe-ready) puis revient ici avec sessionId.
            </div>
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
