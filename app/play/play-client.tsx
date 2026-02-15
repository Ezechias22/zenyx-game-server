"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Game = {
  id: string
  name: string
  kind: "SLOT" | "CRASH" | "DICE" | string
  rtp?: number
  volatility?: string
  ui?: { aspectRatio?: string; width?: number; height?: number }
  assets?: {
    cover?: string
    background?: string
    symbols?: string[] // array de paths "/assets/..."
  }
}

type ProviderPlayResponse = {
  sessionId?: string
  gameCode?: string
  kind?: string
  bet?: number
  win?: number
  balance?: number
  currency?: string
  nonce?: number
  result?: {
    symbols?: string[] // IMPORTANT: 15 symbols = 5x3, ordre provider
    [k: string]: unknown
  }
  [k: string]: unknown
}

const REELS = 5
const ROWS = 3
const TOTAL = REELS * ROWS

function safeStr(v: unknown) {
  return typeof v === "string" ? v : ""
}
function safeNum(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function flattenToGrid(symbols15: string[]) {
  // Provider doit renvoyer 15 symbols (5x3).
  // On accepte aussi autre taille -> on remplit.
  const out = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => ""))
  for (let i = 0; i < TOTAL; i++) {
    const s = symbols15[i] || ""
    const reel = i % REELS
    const row = Math.floor(i / REELS)
    if (row < ROWS) out[reel][row] = s
  }
  return out
}

function randomGridFromPool(pool: string[]) {
  const p = pool.length ? pool : [""]
  const pick = () => p[Math.floor(Math.random() * p.length)] || ""
  const out = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => pick()))
  return out
}

function toAssetProxy(path: string) {
  // path = "/assets/xxx.png" → proxy même origin (évite NotSameOrigin)
  return `/api/assets?path=${encodeURIComponent(path)}`
}

export default function PlayClient({
  sessionId,
  initialGameCode
}: {
  sessionId: string
  initialGameCode: string
}) {
  const [games, setGames] = useState<Game[]>([])
  const [gameCode, setGameCode] = useState<string>(initialGameCode || "")
  const [grid, setGrid] = useState<string[][]>(() => randomGridFromPool([]))

  const [bet, setBet] = useState<number>(1)
  const [win, setWin] = useState<number>(0)
  const [balance, setBalance] = useState<number>(0)
  const [currency, setCurrency] = useState<string>("BRL")

  const [spinning, setSpinning] = useState<boolean>(false)
  const [flashWin, setFlashWin] = useState<boolean>(false)

  const spinTimer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearInterval(spinTimer.current)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  // 1) Load catalog (game list)
  useEffect(() => {
    let dead = false
    fetch("/api/games", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (dead) return
        const list: Game[] = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : []
        setGames(list)

        // Si pas de gameCode dans l'URL, on peut essayer de deviner plus tard (après /api/play),
        // mais pour l'UI initiale on reste safe.
      })
      .catch(() => {
        if (dead) return
        setGames([])
      })
    return () => {
      dead = true
    }
  }, [])

  const game: Game | undefined = useMemo(() => {
    if (!gameCode) return undefined
    return games.find((g) => g.id === gameCode)
  }, [games, gameCode])

  const symbolPool: string[] = useMemo(() => {
    const s = game?.assets?.symbols
    return Array.isArray(s) ? s.filter((x) => typeof x === "string" && x.length > 0) : []
  }, [game])

  // 2) Ensure initial grid shows symbols immediately when catalog loaded
  useEffect(() => {
    if (!symbolPool.length) return
    setGrid(randomGridFromPool(symbolPool))
    // Preload symbols (best-effort)
    symbolPool.slice(0, 40).forEach((p) => {
      const img = new Image()
      img.src = toAssetProxy(p)
    })
  }, [symbolPool])

  const backgroundUrl = useMemo(() => {
    const p = game?.assets?.background
    return p ? toAssetProxy(p) : ""
  }, [game])

  async function doSpin() {
    if (spinning) return
    setSpinning(true)
    setFlashWin(false)

    // Anim "shuffle" pendant le call API
    if (spinTimer.current) window.clearInterval(spinTimer.current)
    if (symbolPool.length) {
      spinTimer.current = window.setInterval(() => {
        setGrid(randomGridFromPool(symbolPool))
      }, 70)
    }

    let payload: ProviderPlayResponse = {}
    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, bet })
      })
      payload = await res.json().catch(() => ({}))
    } catch {
      payload = {}
    }

    // Stop animation et settle
    const settleMs = 900
    window.setTimeout(() => {
      if (spinTimer.current) window.clearInterval(spinTimer.current)
      spinTimer.current = null
      setSpinning(false)
    }, settleMs)

    // Update stats (NE PAS rendre d'objet brut)
    const nextWin = safeNum(payload?.win, 0)
    const nextBalance = safeNum(payload?.balance, balance)
    const nextCurrency = safeStr(payload?.currency) || currency

    setWin(nextWin)
    setBalance(nextBalance)
    setCurrency(nextCurrency)

    // Update gameCode if provider returns it (important si /play n'a pas gameCode)
    const gc = safeStr(payload?.gameCode)
    if (gc && gc !== gameCode) setGameCode(gc)

    // 3) Replace grid by provider result.symbols if provided
    const resultSymbols = payload?.result?.symbols
    if (Array.isArray(resultSymbols) && resultSymbols.length) {
      const clean = resultSymbols.filter((x) => typeof x === "string" && x.length > 0)
      // settle slightly after animation
      window.setTimeout(() => {
        setGrid(flattenToGrid(clean))
      }, settleMs - 120)
    } else {
      // fallback: at least show a stable grid
      window.setTimeout(() => {
        if (symbolPool.length) setGrid(randomGridFromPool(symbolPool))
      }, settleMs - 120)
    }

    if (nextWin > 0) {
      window.setTimeout(() => {
        setFlashWin(true)
        if (flashTimer.current) window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setFlashWin(false), 900)
      }, settleMs + 40)
    }
  }

  return (
    <main style={page(backgroundUrl)}>
      {/* Header compact (pas de panels en haut) */}
      <header style={headerBar}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>
            {game?.name ? `ZENYX • ${game.name}` : "ZENYX • PLAY"}
          </div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Session:{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{sessionId}</span>
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
      </header>

      {/* Stage */}
      <section style={stageWrap}>
        <div style={stageInner}>
          {/* Overlay flash win */}
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              opacity: flashWin ? 1 : 0,
              transition: "opacity .15s ease",
              background: "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.55), transparent 60%)",
              mixBlendMode: "screen"
            }}
          />

          {/* Responsive grid reels */}
          <div style={reelsGrid}>
            {Array.from({ length: REELS }).map((_, reelIdx) => (
              <div key={reelIdx} style={reelCol(spinning, reelIdx)}>
                {Array.from({ length: ROWS }).map((__, rowIdx) => {
                  const sym = grid[reelIdx]?.[rowIdx] || ""
                  const src = sym ? toAssetProxy(sym) : ""
                  const highlight = flashWin && rowIdx === 1
                  return (
                    <div key={rowIdx} style={cell(highlight)}>
                      {src ? (
                        <img
                          src={src}
                          alt="symbol"
                          loading="lazy"
                          decoding="async"
                          style={symbolImg}
                          draggable={false}
                        />
                      ) : (
                        <div style={{ opacity: 0.35, fontSize: 12 }}> </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div style={glass} />
        </div>
      </section>

      {/* Sticky Footer (BET / WIN / BALANCE + SPIN) */}
      <footer style={footerSticky}>
        <div style={footerCards}>
          <div style={miniCard}>
            <div style={miniLabel}>BET</div>
            <div style={miniValue}>{bet}</div>
            <div style={betRow}>
              {[1, 2, 5, 10].map((x) => (
                <button key={x} onClick={() => setBet(x)} style={pill(bet === x)}>
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div style={miniCard}>
            <div style={miniLabel}>WIN</div>
            <div style={miniValue}>{win}</div>
          </div>

          <div style={miniCard}>
            <div style={miniLabel}>BALANCE</div>
            <div style={miniValue}>
              {balance} <span style={{ opacity: 0.75, fontSize: 14 }}>{currency}</span>
            </div>
          </div>
        </div>

        <button onClick={doSpin} disabled={spinning} style={footerSpin}>
          {spinning ? "SPIN..." : "SPIN"}
        </button>
      </footer>

      {/* spacer pour éviter que le footer cache la grille */}
      <div style={{ height: 140 }} />
    </main>
  )
}

/* ---------------- styles (inline, production-safe) ---------------- */

const page = (backgroundUrl: string): React.CSSProperties => ({
  minHeight: "100vh",
  color: "#fff",
  background: backgroundUrl
    ? `linear-gradient(rgba(0,0,0,0.76), rgba(0,0,0,0.9)), url(${backgroundUrl}) center/cover no-repeat`
    : "#060913",
  padding: 16,
  display: "grid",
  gap: 12
})

const headerBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap"
}

const btnGhost: React.CSSProperties = {
  textDecoration: "none",
  color: "#fff",
  opacity: 0.92,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  fontWeight: 900,
  fontSize: 13
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  background: "#7c3aed",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontWeight: 950,
  fontSize: 13,
  cursor: "pointer"
}

const stageWrap: React.CSSProperties = {
  width: "100%",
  display: "grid",
  placeItems: "center"
}

const stageInner: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 980,
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(10,14,24,0.68)"
}

const reelsGrid: React.CSSProperties = {
  width: "100%",
  padding: 14,
  display: "grid",
  gap: 10,
  // Responsive: mobile 3-4 colonnes auto, desktop 5 colonnes
  gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 30vw), 1fr))",
  alignItems: "stretch"
}

const reelCol = (spinning: boolean, idx: number): React.CSSProperties => ({
  background: "rgba(17,24,39,0.62)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "repeat(3, 1fr)",
  minHeight: "clamp(240px, 42vw, 420px)",
  transform: spinning ? `translateY(${(idx % 2 === 0 ? -1 : 1) * 8}px)` : "translateY(0px)",
  transition: "transform .18s ease"
})

const cell = (highlight: boolean): React.CSSProperties => ({
  display: "grid",
  placeItems: "center",
  background: highlight ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.03)",
  borderBottom: "1px solid rgba(255,255,255,0.06)"
})

const symbolImg: React.CSSProperties = {
  width: "clamp(56px, 12vw, 92px)",
  height: "clamp(56px, 12vw, 92px)",
  objectFit: "contain",
  filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.45))"
}

const glass: React.CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 35%, transparent 70%, rgba(255,255,255,0.05) 100%)",
  opacity: 0.6
}

const footerSticky: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  padding: 12,
  background: "linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.55))",
  backdropFilter: "blur(10px)",
  borderTop: "1px solid rgba(255,255,255,0.10)",
  zIndex: 50,
  display: "grid",
  gap: 10
}

const footerCards: React.CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10
}

const miniCard: React.CSSProperties = {
  background: "rgba(17,24,39,0.72)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 12,
  minHeight: 78
}

const miniLabel: React.CSSProperties = { opacity: 0.7, fontSize: 12, fontWeight: 950 }
const miniValue: React.CSSProperties = { marginTop: 6, fontSize: 18, fontWeight: 950 }

const betRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }

const pill = (active: boolean): React.CSSProperties => ({
  padding: "7px 10px",
  borderRadius: 999,
  background: active ? "#7c3aed" : "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontWeight: 950,
  fontSize: 12,
  cursor: "pointer"
})

const footerSpin: React.CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  padding: "14px 16px",
  borderRadius: 14,
  background: "#7c3aed",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontWeight: 950,
  fontSize: 14,
  cursor: "pointer"
}
