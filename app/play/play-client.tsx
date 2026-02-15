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
  ui?: {
    aspectRatio?: string
    width?: number
    height?: number
  }
}

type PlayResult = {
  sessionId?: string
  gameCode?: string
  bet?: number
  win?: number
  balance?: number | { balance?: number }
  currency?: string
  result?: {
    symbols?: string[] | string[][]
    paylines?: unknown
  }
  provider?: unknown
  [k: string]: unknown
}

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function normalizeSymbolsToGrid(
  symbols: string[] | string[][] | undefined,
  fallbackPool: string[],
  cols = 5,
  rows = 3
): string[][] {
  // If provider returns 2D already:
  if (Array.isArray(symbols) && Array.isArray(symbols[0])) {
    const s2d = symbols as string[][]
    // Normalize to cols x rows
    const grid: string[][] = Array.from({ length: cols }, () => Array(rows).fill(""))
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        grid[c][r] = s2d?.[c]?.[r] || fallbackPool[(c * rows + r) % Math.max(1, fallbackPool.length)] || ""
      }
    }
    return grid
  }

  // If provider returns flat array:
  const flat = (symbols as string[] | undefined) ?? []
  const grid: string[][] = Array.from({ length: cols }, () => Array(rows).fill(""))
  const total = cols * rows

  for (let i = 0; i < total; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    grid[c][r] =
      flat[i] ||
      fallbackPool[i % Math.max(1, fallbackPool.length)] ||
      ""
  }
  return grid
}

function randomGridFromPool(pool: string[], cols = 5, rows = 3): string[][] {
  const safePool = pool?.length ? pool : []
  const pick = () =>
    safePool.length
      ? safePool[Math.floor(Math.random() * safePool.length)]
      : ""

  return Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => pick())
  )
}

function resolveAssetUrl(pathOrUrl: string | undefined) {
  if (!pathOrUrl) return ""
  // If already absolute:
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  // Best effort: serve via /api/assets to avoid CORS issues
  // (Your /api/assets proxies provider assets.)
  return `/api/assets?path=${encodeURIComponent(pathOrUrl)}`
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

  const symbolPool = useMemo(() => {
    const arr = game?.assets?.symbols
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  }, [game])

  const bgUrl = useMemo(() => resolveAssetUrl(game?.assets?.background), [game])

  // Prevent double spins
  const spinLock = useRef(false)

  useEffect(() => {
    // If sessionId missing -> go lobby
    if (!sessionId) {
      window.location.href = "/"
      return
    }

    let alive = true
    ;(async () => {
      try {
        setLoading(true)

        // 1) Fetch catalog
        const res = await fetch("/api/games", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load games")
        const games = (await res.json()) as Game[]

        // 2) Determine gameCode if not provided
        // If not provided, we can keep unknown and still play (provider returns gameCode on play).
        const found =
          (gameCode && games.find(g => (g.id || "").toString() === gameCode)) ||
          null

        if (!alive) return
        setGame(found)
        if (found?.id) setGameCode(found.id)

        // 3) Build initial grid from assets.symbols
        const pool = Array.isArray(found?.assets?.symbols) ? found!.assets!.symbols!.filter(Boolean) : []
        const initial = randomGridFromPool(pool, 5, 3)
        setGrid(initial)

        // 4) Preload symbols (fast)
        pool.slice(0, 50).forEach(p => {
          const img = new Image()
          img.src = resolveAssetUrl(p)
        })
      } catch {
        // If catalog fails, still render with empty background & grid.
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function doSpin() {
    if (!sessionId) return
    if (spinLock.current) return

    try {
      spinLock.current = true
      setSpinning(true)
      setWin(0)

      // quick fake spin animation by shuffling grid first
      if (symbolPool.length) {
        setGrid(randomGridFromPool(symbolPool, 5, 3))
      }

      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          bet: bet
        })
      })

      const data = (await res.json()) as PlayResult

      if (!res.ok) {
        // Keep UI alive; stop spinning
        setSpinning(false)
        return
      }

      const nextGameCode = typeof data.gameCode === "string" ? data.gameCode : gameCode
      if (nextGameCode && !game?.id) {
        // If game not set (missing gameCode initially), fetch catalog again and set game
        try {
          const gRes = await fetch("/api/games", { cache: "no-store" })
          if (gRes.ok) {
            const games = (await gRes.json()) as Game[]
            const found = games.find(g => (g.id || "") === nextGameCode) || null
            setGame(found)
            setGameCode(nextGameCode)
          }
        } catch {}
      }

      const nextWin = typeof data.win === "number" ? data.win : 0
      const nextCurrency =
        typeof data.currency === "string" ? data.currency : currency

      let nextBalance = 0
      if (typeof data.balance === "number") nextBalance = data.balance
      else if (data.balance && typeof data.balance === "object") {
        const b = (data.balance as { balance?: number }).balance
        nextBalance = typeof b === "number" ? b : balance
      } else {
        nextBalance = balance
      }

      // Prefer provider result symbols; fallback to assets.symbols
      const resultSymbols = data?.result?.symbols
      const pool = symbolPool.length ? symbolPool : []
      const nextGrid = normalizeSymbolsToGrid(resultSymbols, pool, 5, 3)

      // Delay slightly so animation feels real
      setTimeout(() => {
        setGrid(nextGrid)
        setWin(nextWin)
        setBalance(nextBalance)
        setCurrency(nextCurrency)
        setSpinning(false)
      }, 350)
    } finally {
      setTimeout(() => {
        spinLock.current = false
      }, 350)
    }
  }

  function setBetQuick(v: number) {
    setBet(clampNumber(v, 1, 1000))
  }

  const title = game?.name ? `ZENYX • ${game.name}` : "ZENYX • PLAY"

  return (
    <div className="playRoot">
      <div
        className="bg"
        style={{
          backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined
        }}
      />
      <div className="overlay" />

      <header className="topBar">
        <div className="left">
          <div className="brand">{title}</div>
          <div className="sub">
            Session: <span className="mono">{sessionId}</span>
          </div>
        </div>

        <div className="right">
          <button
            className="ghostBtn"
            onClick={() => (window.location.href = "/")}
            type="button"
          >
            ← Lobby
          </button>
          <button
            className="spinBtnSmall"
            onClick={doSpin}
            disabled={spinning || loading}
            type="button"
          >
            {spinning ? "..." : "SPIN"}
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
                      {src ? (
                        <img
                          className="sym"
                          src={src}
                          alt="symbol"
                          draggable={false}
                        />
                      ) : (
                        <div className="symPlaceholder" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className={`winGlow ${win > 0 ? "on" : ""}`} />
        </div>
      </main>

      <footer className="footer">
        <div className="panel">
          <div className="label">BET</div>
          <div className="value">{bet}</div>
          <div className="chips">
            {[1, 2, 5, 10].map(v => (
              <button
                key={v}
                className={`chip ${bet === v ? "active" : ""}`}
                onClick={() => setBetQuick(v)}
                type="button"
              >
                {v}
              </button>
            ))}
          </div>
          <div className="betRow">
            <button className="mini" onClick={() => setBetQuick(bet - 1)} type="button">−</button>
            <button className="mini" onClick={() => setBetQuick(bet + 1)} type="button">+</button>
          </div>
        </div>

        <div className="panel">
          <div className="label">WIN</div>
          <div className={`value ${win > 0 ? "win" : ""}`}>{win}</div>
        </div>

        <div className="panel">
          <div className="label">BALANCE</div>
          <div className="value">
            {balance} <span className="cur">{currency}</span>
          </div>
        </div>

        <button
          className={`spinBtn ${spinning ? "busy" : ""}`}
          onClick={doSpin}
          disabled={spinning || loading}
          type="button"
          aria-label="Spin"
        >
          <div className="spinRing" />
          <div className="spinText">{spinning ? "..." : "SPIN"}</div>
        </button>
      </footer>
    </div>
  )
}
