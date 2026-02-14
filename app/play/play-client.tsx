"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Game = {
  id: string
  name: string
  kind: string
  rtp?: number
  assets?: {
    cover?: string
    background?: string
    symbols?: string[]
  }
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
  [k: string]: unknown
}

const REELS = 5
const ROWS = 3

function toNum(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildGrid(symbols: string[]): string[][] {
  const safe = symbols.length ? symbols : [""] // never empty
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => pick(safe)))
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
  const [bet, setBet] = useState(1)

  const [win, setWin] = useState(0)
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState("BRL")

  const [grid, setGrid] = useState<string[][]>(() => buildGrid([]))
  const [spinning, setSpinning] = useState(false)
  const [flashWin, setFlashWin] = useState(false)

  const spinTimer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)

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

  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearInterval(spinTimer.current)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  const game = useMemo(() => {
    if (!gameCode) return undefined
    return games.find((g) => g.id === gameCode)
  }, [games, gameCode])

  const symbols = useMemo(() => {
    const s = game?.assets?.symbols
    return Array.isArray(s) ? s.filter(Boolean) : []
  }, [game])

  const backgroundUrl = useMemo(() => {
    const p = game?.assets?.background
    return p ? `/api/assets?path=${encodeURIComponent(p)}` : ""
  }, [game])

  // Initial grid once symbols are available
  useEffect(() => {
    if (!symbols.length) return
    setGrid(buildGrid(symbols))
  }, [symbols])

  async function doSpin() {
    if (spinning) return
    if (!sessionId) return

    setSpinning(true)
    setFlashWin(false)

    // 🔊 SOUND HOOKS (tu ajoutes toi-même)
    // playSound("/sounds/spin.mp3")

    // Animate reels (shuffle)
    if (spinTimer.current) window.clearInterval(spinTimer.current)
    spinTimer.current = window.setInterval(() => {
      if (!symbols.length) return
      setGrid(buildGrid(symbols))
    }, 70)

    // Call provider via internal API
    let data: PlayResp = {}
    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, bet })
      })
      data = await res.json().catch(() => ({}))
    } catch {
      data = {}
    }

    // Stop animation with a staggered "settle"
    const settleMs = 900
    window.setTimeout(() => {
      if (spinTimer.current) window.clearInterval(spinTimer.current)
      spinTimer.current = null
      setGrid(buildGrid(symbols))
      setSpinning(false)
    }, settleMs)

    // Update stats safely (never render objects)
    const nextWin = toNum(data?.win, 0)
    const nextBal = toNum(data?.balance, balance)
    const nextCur = (data?.currency || currency).toString()

    setWin(nextWin)
    setBalance(nextBal)
    setCurrency(nextCur)

    if (typeof data?.gameCode === "string" && data.gameCode) {
      setGameCode(data.gameCode)
    }

    if (nextWin > 0) {
      window.setTimeout(() => {
        setFlashWin(true)
        // playSound("/sounds/win.mp3")
        if (flashTimer.current) window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setFlashWin(false), 900)
      }, settleMs + 40)
    }
  }

  const title = game?.name || "PLAY"
  const kind = game?.kind || ""

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#fff",
        background: backgroundUrl
          ? `linear-gradient(rgba(0,0,0,0.74), rgba(0,0,0,0.90)), url(${backgroundUrl}) center/cover no-repeat`
          : "radial-gradient(1200px 700px at 20% 0%, rgba(124,58,237,0.18), transparent 60%), #0b0f1a",
        padding: 18
      }}
    >
      <div style={topbar}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 22 }}>
            ZENYX • {title}
          </div>
          <div style={{ opacity: 0.72, fontSize: 13 }}>
            {kind ? `${kind} • ` : ""}
            Session: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{sessionId}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/" style={btnGhost}>
            ← Lobby
          </a>
          <button onClick={doSpin} disabled={spinning} style={btnPrimary}>
            {spinning ? "SPIN..." : "SPIN"}
          </button>
        </div>
      </div>

      <div style={statsGrid}>
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

      {/* SLOT REELS */}
      <section style={{ marginTop: 14 }}>
        <div style={stageWrap}>
          {/* glow / win highlight */}
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              opacity: flashWin ? 1 : spinning ? 0.7 : 0,
              transition: "opacity .15s ease",
              background:
                "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.55), transparent 60%)",
              mixBlendMode: "screen"
            }}
          />

          <div style={stageHeader}>
            <div style={{ fontWeight: 950, letterSpacing: 0.6, opacity: 0.9 }}>SLOT</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Symbols: {symbols.length || 0}
            </div>
          </div>

          <div style={machine}>
            {Array.from({ length: REELS }).map((_, reelIdx) => (
              <div key={reelIdx} style={reelCol(spinning, reelIdx)}>
                {Array.from({ length: ROWS }).map((__, rowIdx) => {
                  const sym = grid[reelIdx]?.[rowIdx] || ""
                  const symSrc = sym ? `/api/assets?path=${encodeURIComponent(sym)}` : ""

                  const centerRow = rowIdx === 1
                  const winRow = flashWin && centerRow // simple payline highlight

                  return (
                    <div key={rowIdx} style={cell(winRow)}>
                      {symSrc ? (
                        <img
                          src={symSrc}
                          alt="symbol"
                          style={{
                            width: "78%",
                            height: "78%",
                            objectFit: "contain",
                            filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.55))"
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div style={{ opacity: 0.35, fontSize: 12 }}>…</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* glass overlay */}
          <div style={glass} />
        </div>
      </section>
    </main>
  )
}

const topbar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start"
}

const statsGrid: React.CSSProperties = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12
}

const card: React.CSSProperties = {
  background: "rgba(17,24,39,0.78)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 18px 60px rgba(0,0,0,0.45)"
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

const btnGhost: React.CSSProperties = {
  textDecoration: "none",
  color: "#fff",
  opacity: 0.88,
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

const stageWrap: React.CSSProperties = {
  position: "relative",
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(10,14,24,0.72)",
  boxShadow: "0 22px 80px rgba(0,0,0,0.60)"
}

const stageHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
}

const machine: React.CSSProperties = {
  width: "100%",
  aspectRatio: "16/9",
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 10,
  padding: 14,
  alignItems: "stretch"
}

const reelCol = (spinning: boolean, idx: number): React.CSSProperties => ({
  background: "rgba(17,24,39,0.62)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "repeat(3, 1fr)",
  transform: spinning ? `translateY(${(idx % 2 === 0 ? -1 : 1) * 8}px)` : "translateY(0px)",
  transition: "transform .18s ease"
})

const cell = (winRow: boolean): React.CSSProperties => ({
  display: "grid",
  placeItems: "center",
  background: winRow ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.03)",
  borderBottom: "1px solid rgba(255,255,255,0.06)"
})

const glass: React.CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 70%, rgba(255,255,255,0.05) 100%)",
  opacity: 0.55
}
