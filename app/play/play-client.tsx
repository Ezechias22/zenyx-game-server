// app/play/play-client.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import "./play-client.css"

type Game = {
  id?: string
  name?: string
  kind?: string
  assets?: {
    cover?: string
    background?: string
    symbols?: string[]
  }
}

type PlayResult = {
  sessionId?: string
  gameCode?: string
  bet?: number
  win?: number
  balance?: number | { balance?: number }
  currency?: string
  result?: { symbols?: string[] | string[][] }
}

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function resolveAssetUrl(pathOrUrl: string | undefined) {
  if (!pathOrUrl) return ""
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `/api/assets?path=${encodeURIComponent(pathOrUrl)}`
}

function randomGridFromPool(pool: string[], cols = 5, rows = 3): string[][] {
  const safe = pool?.length ? pool : []
  const pick = () => (safe.length ? safe[Math.floor(Math.random() * safe.length)] : "")
  return Array.from({ length: cols }, () => Array.from({ length: rows }, pick))
}

function normalizeSymbolsToGrid(
  symbols: string[] | string[][] | undefined,
  fallbackPool: string[],
  cols = 5,
  rows = 3
): string[][] {
  if (Array.isArray(symbols) && Array.isArray(symbols[0])) {
    const s2d = symbols as string[][]
    const grid = Array.from({ length: cols }, () => Array(rows).fill(""))
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        grid[c][r] = s2d?.[c]?.[r] || fallbackPool[(c * rows + r) % Math.max(1, fallbackPool.length)] || ""
      }
    }
    return grid
  }
  const flat = (symbols as string[] | undefined) ?? []
  const grid = Array.from({ length: cols }, () => Array(rows).fill(""))
  const total = cols * rows
  for (let i = 0; i < total; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    grid[c][r] = flat[i] || fallbackPool[i % Math.max(1, fallbackPool.length)] || ""
  }
  return grid
}

export default function PlayClient({
  sessionId,
  initialGameCode
}: {
  sessionId: string
  initialGameCode: string
}) {
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)

  const [game, setGame] = useState<Game | null>(null)
  const [gameCode, setGameCode] = useState<string>(initialGameCode || "")

  const [bet, setBet] = useState<number>(1)
  const [win, setWin] = useState<number>(0)
  const [balance, setBalance] = useState<number>(0)
  const [currency, setCurrency] = useState<string>("BRL")

  const [grid, setGrid] = useState<string[][]>(() => Array.from({ length: 5 }, () => Array(3).fill("")))
  const symbolPool = useMemo(() => (game?.assets?.symbols ?? []).filter(Boolean), [game])
  const bgUrl = useMemo(() => resolveAssetUrl(game?.assets?.background), [game])

  const spinLock = useRef(false)

  useEffect(() => {
    if (!sessionId) {
      window.location.href = "/"
      return
    }

    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/games", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load games")
        const games = (await res.json()) as Game[]
        const found = (gameCode && games.find(g => (g.id || "") === gameCode)) || null
        if (!alive) return

        setGame(found)
        if (found?.id) setGameCode(found.id)

        const pool = (found?.assets?.symbols ?? []).filter(Boolean)
        setGrid(randomGridFromPool(pool, 5, 3))

        pool.slice(0, 60).forEach(p => {
          const img = new Image()
          img.src = resolveAssetUrl(p)
        })
      } catch {
        // keep UI alive even if catalog fails
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const title = game?.name ? `ZENYX • ${game.name}` : "ZENYX • JOUER"

  function betMinus() {
    setBet(b => clampNumber(b - 1, 1, 1000))
  }
  function betPlus() {
    setBet(b => clampNumber(b + 1, 1, 1000))
  }

  async function doSpin() {
    if (!sessionId) return
    if (spinLock.current) return
    try {
      spinLock.current = true
      setSpinning(true)
      setWin(0)

      if (symbolPool.length) setGrid(randomGridFromPool(symbolPool, 5, 3))

      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, bet })
      })

      const data = (await res.json()) as PlayResult
      if (!res.ok) {
        setSpinning(false)
        return
      }

      const nextWin = typeof data.win === "number" ? data.win : 0
      const nextCurrency = typeof data.currency === "string" ? data.currency : currency

      let nextBalance = balance
      if (typeof data.balance === "number") nextBalance = data.balance
      else if (data.balance && typeof data.balance === "object") {
        const b = (data.balance as { balance?: number }).balance
        if (typeof b === "number") nextBalance = b
      }

      const nextGrid = normalizeSymbolsToGrid(data?.result?.symbols, symbolPool, 5, 3)

      setTimeout(() => {
        setGrid(nextGrid)
        setWin(nextWin)
        setBalance(nextBalance)
        setCurrency(nextCurrency)
        setSpinning(false)
      }, 260)
    } finally {
      setTimeout(() => {
        spinLock.current = false
      }, 260)
    }
  }

  return (
    <div className="playRoot">
      <div className="bg" style={{ backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined }} />
      <div className="overlay" />

      <header className="topBar">
        <div className="left">
          <div className="brand">{title}</div>
          <div className="sub">
            Session : <span className="mono">{sessionId}</span>
          </div>
        </div>

        <div className="right">
          <button className="ghostBtn" onClick={() => (window.location.href = "/")} type="button">
            ← Hall d’entrée
          </button>
        </div>
      </header>

      <main className="stage">
        <div className="reelFrame">
          <div className={`reels ${spinning ? "spinning" : ""}`}>
            {Array.from({ length: 5 }).map((_, col) => (
              <div className="reelCol" key={col}>
                {Array.from({ length: 3 }).map((__, row) => {
                  const path = grid?.[col]?.[row] || ""
                  const src = resolveAssetUrl(path)
                  return (
                    <div className="cell" key={`${col}-${row}`}>
                      {src ? <img className="sym" src={src} alt="symbol" draggable={false} /> : <div className="symPlaceholder" />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className={`winGlow ${win > 0 ? "on" : ""}`} />
        </div>
      </main>

      {/* MOBILE-FIRST footer: 2 rows, SPIN centered, never cut */}
      <footer className="footer">
        <div className="footerGrid">
          <div className="panel">
            <div className="label">PARI</div>
            <div className="value">{bet}</div>
            <div className="betControls">
              <button className="mini" onClick={betMinus} type="button" aria-label="Minus">
                −
              </button>
              <button className="mini" onClick={betPlus} type="button" aria-label="Plus">
                +
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="label">GAGNER</div>
            <div className={`value ${win > 0 ? "win" : ""}`}>{win}</div>
          </div>

          <div className="panel">
            <div className="label">ÉQUILIBRE</div>
            <div className="value">
              {balance} <span className="cur">{currency}</span>
            </div>
          </div>

          <button className={`spinBtn ${spinning ? "busy" : ""}`} onClick={doSpin} disabled={spinning || loading} type="button">
            <div className="spinRing" />
            <div className="spinText">{spinning ? "..." : "SPIN"}</div>
          </button>
        </div>
      </footer>
    </div>
  )
}
