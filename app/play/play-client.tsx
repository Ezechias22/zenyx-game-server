// app/play/play-client.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Game = {
  id: string
  name: string
  kind: "SLOT" | "CRASH" | "DICE" | string
  assets?: {
    cover?: string
    background?: string
    symbols?: string[]
  }
}

type PlayClientProps = {
  sessionId: string
  initialGameCode?: string
}

type ApiError = { error?: string; message?: string; statusCode?: number; details?: any }

function safeText(v: unknown) {
  if (v == null) return ""
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeGrid(symbols: string[], reels = 5, rows = 3) {
  const g: string[][] = []
  for (let c = 0; c < reels; c++) {
    const col: string[] = []
    for (let r = 0; r < rows; r++) col.push(pickRandom(symbols))
    g.push(col)
  }
  return g
}

function normalizeSymbolsToGrid(input: any, reels = 5, rows = 3): string[][] | null {
  if (!input) return null

  // grid [reel][row]
  if (Array.isArray(input) && Array.isArray(input[0])) {
    const grid = input as any[][]
    const out: string[][] = []
    for (let c = 0; c < Math.min(reels, grid.length); c++) {
      out[c] = []
      for (let r = 0; r < Math.min(rows, grid[c]?.length ?? 0); r++) out[c][r] = String(grid[c][r] ?? "")
      while (out[c].length < rows) out[c].push("")
    }
    while (out.length < reels) out.push(Array.from({ length: rows }, () => ""))
    return out
  }

  // flat
  if (Array.isArray(input) && input.length >= reels * rows) {
    const flat = input.map((x) => String(x ?? ""))

    // reel-major
    const reelMajor: string[][] = []
    for (let c = 0; c < reels; c++) reelMajor.push(flat.slice(c * rows, c * rows + rows))
    if (reelMajor.flat().filter(Boolean).length >= 5) return reelMajor

    // row-major fallback
    const rowMajor: string[][] = Array.from({ length: reels }, () => Array.from({ length: rows }, () => ""))
    let i = 0
    for (let r = 0; r < rows; r++) for (let c = 0; c < reels; c++) rowMajor[c][r] = flat[i++] ?? ""
    return rowMajor
  }

  const maybe = input?.symbols ?? input?.reels ?? input?.grid
  if (maybe) return normalizeSymbolsToGrid(maybe, reels, rows)

  return null
}

export default function PlayClient({ sessionId, initialGameCode = "" }: PlayClientProps) {
  const router = useRouter()

  const [catalog, setCatalog] = useState<Game[]>([])
  const [gameCode, setGameCode] = useState<string>(initialGameCode)
  const [game, setGame] = useState<Game | null>(null)

  const [bet, setBet] = useState<number>(1)
  const [win, setWin] = useState<number>(0)
  const [balance, setBalance] = useState<number>(0)

  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => ""))
  )
  const [spinning, setSpinning] = useState(false)
  const [err, setErr] = useState<string>("")

  const spinAnimTimer = useRef<number | null>(null)

  const providerBase = useMemo(() => {
    const raw =
      (process.env.NEXT_PUBLIC_PROVIDER_BASE_URL as string | undefined) ||
      (process.env.NEXT_PUBLIC_PROVIDER_ORIGIN as string | undefined) ||
      "https://zenyx-games-provider-production.up.railway.app"
    return raw.replace(/\/+$/, "")
  }, [])

  const bets = useMemo(() => [1, 2, 5, 10], [])

  useEffect(() => {
    return () => {
      if (spinAnimTimer.current) window.clearInterval(spinAnimTimer.current)
    }
  }, [])

  // load catalog (server route hides headers)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setErr("")
      try {
        const res = await fetch("/api/games", { cache: "no-store" })
        if (!res.ok) throw new Error(`games ${res.status}`)
        const data = await res.json()
        const list: Game[] = Array.isArray(data) ? data : []
        if (!alive) return

        setCatalog(list)

        const byId = gameCode ? list.find((g) => g.id === gameCode) : null
        const fallbackSlot = list.find((g) => g.kind === "SLOT") ?? list[0] ?? null
        const chosen = byId ?? fallbackSlot

        setGame(chosen ?? null)
        if (!gameCode && chosen?.id) setGameCode(chosen.id)
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message ?? "Failed to load catalog")
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // initial grid + preload symbols
  useEffect(() => {
    const symbols = game?.assets?.symbols ?? []
    if (!symbols.length) return

    for (const p of symbols.slice(0, 80)) {
      const url = `${providerBase}${p}`
      const img = new Image()
      img.src = url
    }

    setGrid(makeGrid(symbols, 5, 3))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id])

  const bgUrl = useMemo(() => {
    const p = game?.assets?.background
    if (!p) return ""
    return `${providerBase}${p}`
  }, [game?.assets?.background, providerBase])

  const symUrl = (p: string) => (p ? `${providerBase}${p}` : "")

  async function doSpin() {
    if (spinning) return
    setErr("")
    setSpinning(true)

    const symbols = (game?.assets?.symbols ?? []).slice()
    if (symbols.length) {
      if (spinAnimTimer.current) window.clearInterval(spinAnimTimer.current)
      spinAnimTimer.current = window.setInterval(() => {
        setGrid(makeGrid(symbols, 5, 3))
      }, 80)
    }

    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ sessionId, bet })
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const m = (json as ApiError)?.message ?? (json as ApiError)?.error ?? `Spin failed (${res.status})`
        throw new Error(typeof m === "string" ? m : safeText(m))
      }

      const newWin = Number(json?.win ?? 0)
      const newBalance = Number(json?.balance ?? 0)
      setWin(Number.isFinite(newWin) ? newWin : 0)
      setBalance(Number.isFinite(newBalance) ? newBalance : 0)

      const gc = typeof json?.gameCode === "string" ? json.gameCode : ""
      if (gc && gc !== gameCode) {
        setGameCode(gc)
        const found = catalog.find((g) => g.id === gc) ?? null
        if (found) setGame(found)
      }

      const resultSymbols =
        json?.provider?.result?.symbols ??
        json?.provider?.result ??
        json?.result?.symbols ??
        json?.result

      const gridFromResult = normalizeSymbolsToGrid(resultSymbols, 5, 3)
      if (gridFromResult) setGrid(gridFromResult)
    } catch (e: any) {
      setErr(e?.message ?? "Spin failed")
    } finally {
      if (spinAnimTimer.current) {
        window.clearInterval(spinAnimTimer.current)
        spinAnimTimer.current = null
      }
      setSpinning(false)
    }
  }

  return (
    <div className="min-h-screen text-white">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      />
      <div className="fixed inset-0 -z-10 bg-black/70" />

      {/* Header (NO SPIN here) */}
      <header className="mx-auto w-full max-w-5xl px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold tracking-wide">
              ZENYX • {game?.name ?? "PLAY"}
            </div>
            <div className="text-xs text-white/60 break-all">Session: {sessionId}</div>
            {err ? <div className="mt-2 text-xs text-red-300">{err}</div> : null}
          </div>

          <Link
            href="/"
            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            ← Lobby
          </Link>
        </div>
      </header>

      {/* Stage */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-40 pt-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_0_80px_rgba(0,0,0,0.55)]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, col) => (
                <div key={col} className="rounded-2xl border border-white/10 bg-white/5 p-2">
                  <div className="grid grid-rows-3 gap-2">
                    {Array.from({ length: 3 }).map((__, row) => {
                      const p = grid?.[col]?.[row] ?? ""
                      const u = p ? symUrl(p) : ""
                      return (
                        <div
                          key={row}
                          className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20"
                          style={{ aspectRatio: "1 / 1" }}
                        >
                          {u ? (
                            <img
                              src={u}
                              alt={`sym-${col}-${row}`}
                              className={`absolute inset-0 m-auto h-[82%] w-[82%] object-contain transition-transform ${
                                spinning ? "scale-[0.92] opacity-75 blur-[0.2px]" : "scale-100 opacity-100"
                              }`}
                              loading="eager"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky footer (ONLY SPIN here) */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-black/50 backdrop-blur-md">
        <div className="mx-auto w-full max-w-5xl px-4 pb-4 pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] font-semibold text-white/70">BET</div>
              <div className="mt-1 text-2xl font-bold">{bet}</div>
              <div className="mt-2 flex gap-2">
                {bets.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBet(b)}
                    className={`h-9 w-9 rounded-full border text-sm font-semibold ${
                      bet === b
                        ? "border-white/20 bg-violet-600/90"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    aria-label={`Bet ${b}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] font-semibold text-white/70">WIN</div>
              <div className="mt-1 text-2xl font-bold">{Number(win).toFixed(0)}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] font-semibold text-white/70">BALANCE</div>
              <div className="mt-1 text-2xl font-bold">
                {Number(balance).toFixed(0)}{" "}
                <span className="text-sm font-semibold text-white/70">BRL</span>
              </div>
            </div>
          </div>

          <button
            onClick={doSpin}
            disabled={spinning}
            className="mt-3 w-full rounded-2xl bg-violet-600 px-4 py-4 text-lg font-extrabold tracking-wide shadow-[0_10px_35px_rgba(124,58,237,0.35)] disabled:opacity-60"
          >
            {spinning ? "SPINNING…" : "SPIN"}
          </button>
        </div>
      </div>
    </div>
  )
}
