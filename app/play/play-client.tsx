// app/play/play-client.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type GameKind = "SLOT" | "CRASH" | "DICE"

type ProviderGame = {
  id: string
  name: string
  kind: GameKind
  rtp?: number
  volatility?: string
  ui?: { aspectRatio?: string; width?: number; height?: number }
  assets: {
    cover: string
    background: string
    symbols?: string[] // SLOT only
  }
}

type PlayResponse = {
  sessionId: string
  gameCode: string
  bet: number
  win: number
  balance: number
  provider?: {
    result?: {
      symbols?: string[] | string[][] // provider may return flat(15) or matrix
      paylines?: number[][]
      winLines?: number[]
    }
    [k: string]: unknown
  }
}

function env(name: string): string {
  const v = process.env.NEXT_PUBLIC_PROVIDER_BASE_URL
  if (name === "PROVIDER_BASE_URL") return (v || "").trim()
  return ""
}

function joinUrl(base: string, path: string): string {
  const b = (base || "").replace(/\/+$/, "")
  const p = (path || "").startsWith("/") ? path : `/${path || ""}`
  return `${b}${p}`
}

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildInitialGrid(symbols: string[], cols = 5, rows = 3): string[] {
  const total = cols * rows
  if (!symbols?.length) return Array.from({ length: total }, () => "")
  return Array.from({ length: total }, () => pickRandom(symbols))
}

function normalizeSymbols(
  raw: unknown,
  fallback: string[]
): { flat: string[]; cols: number; rows: number } {
  // Accept:
  // - flat array length 15
  // - matrix [rows][cols] or [cols][rows]
  // If unknown, fallback to initial
  const cols = 5
  const rows = 3
  const total = cols * rows

  if (Array.isArray(raw)) {
    // matrix?
    if (raw.length && Array.isArray(raw[0])) {
      const m = raw as unknown[][]
      const flatA = m.flat().filter((x) => typeof x === "string") as string[]
      if (flatA.length >= total) return { flat: flatA.slice(0, total), cols, rows }
    }
    // flat?
    const flatB = raw.filter((x) => typeof x === "string") as string[]
    if (flatB.length >= total) return { flat: flatB.slice(0, total), cols, rows }
  }

  return { flat: fallback.slice(0, total), cols, rows }
}

async function fetchProviderJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = env("PROVIDER_BASE_URL")
  if (!base) throw new Error("Missing NEXT_PUBLIC_PROVIDER_BASE_URL")
  const url = joinUrl(base, path)

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      // REQUIRED provider headers
      "x-public-token": process.env.NEXT_PUBLIC_PUBLIC_TOKEN || "",
      "x-operator-key": process.env.NEXT_PUBLIC_OPERATOR_KEY || "",
      ...(init?.headers || {})
    },
    cache: "no-store"
  })

  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new Error(`Provider ${path} failed (${res.status}): ${JSON.stringify(body)}`)
  }

  return (await res.json()) as T
}

function preloadImages(urls: string[]) {
  for (const u of urls) {
    if (!u) continue
    const img = new Image()
    img.decoding = "async"
    img.loading = "eager"
    img.src = u
  }
}

export default function PlayClient(props: { sessionId: string; initialGameCode: string }) {
  const router = useRouter()

  const providerBaseUrl = env("PROVIDER_BASE_URL")

  const sessionId = props.sessionId
  const [gameCode, setGameCode] = useState<string>(props.initialGameCode || "")
  const [game, setGame] = useState<ProviderGame | null>(null)

  const [bet, setBet] = useState<number>(1)
  const [win, setWin] = useState<number>(0)
  const [balance, setBalance] = useState<number>(0)

  const [grid, setGrid] = useState<string[]>(() => Array.from({ length: 15 }, () => ""))
  const [isSpinning, setIsSpinning] = useState(false)
  const [err, setErr] = useState<string>("")

  const spinTimerRef = useRef<number | null>(null)

  const coverBg = useMemo(() => {
    if (!providerBaseUrl || !game?.assets?.background) return ""
    return joinUrl(providerBaseUrl, game.assets.background)
  }, [providerBaseUrl, game?.assets?.background])

  // Load catalog, resolve game, build initial grid immediately (no "...")
  useEffect(() => {
    let alive = true

    async function boot() {
      try {
        setErr("")
        const games = await fetchProviderJson<ProviderGame[]>("/v1/public/games", { method: "GET" })

        if (!alive) return

        let resolvedGame: ProviderGame | undefined
        if (gameCode) resolvedGame = games.find((g) => g.id === gameCode)
        if (!resolvedGame) {
          // if gameCode missing, try to infer from session? (not possible), fallback to first slot
          resolvedGame = games.find((g) => g.kind === "SLOT") || games[0]
          setGameCode(resolvedGame?.id || "")
        }

        if (!resolvedGame) throw new Error("No games returned by provider")

        setGame(resolvedGame)

        // preload symbols & cover/background
        const symbols = (resolvedGame.assets.symbols || []).map((p) => joinUrl(providerBaseUrl, p))
        const bg = joinUrl(providerBaseUrl, resolvedGame.assets.background)
        const cover = joinUrl(providerBaseUrl, resolvedGame.assets.cover)
        preloadImages([bg, cover, ...symbols])

        // show an initial random grid immediately for SLOT games
        if (resolvedGame.kind === "SLOT") {
          const initial = buildInitialGrid(symbols, 5, 3)
          setGrid(initial)
        } else {
          // non-slot: keep empty or placeholder
          setGrid(Array.from({ length: 15 }, () => ""))
        }
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message || "Failed to load catalog")
      }
    }

    void boot()

    return () => {
      alive = false
      if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current)
    }
  }, [gameCode, providerBaseUrl])

  // Simple spin animation: randomize quickly then settle to result
  function runSpinAnimation(finalGrid: string[]) {
    if (!game?.assets?.symbols?.length) {
      setGrid(finalGrid)
      return
    }
    const symbols = (game.assets.symbols || []).map((p) => joinUrl(providerBaseUrl, p))
    const frames = 14
    const intervalMs = 35

    let frame = 0
    const tick = () => {
      frame++
      // shuffle-ish
      setGrid(buildInitialGrid(symbols, 5, 3))
      if (frame >= frames) {
        setGrid(finalGrid)
        return
      }
      spinTimerRef.current = window.setTimeout(tick, intervalMs)
    }
    tick()
  }

  async function spin() {
    if (isSpinning) return
    if (!sessionId) return
    if (!gameCode) return

    setIsSpinning(true)
    setErr("")
    try {
      const payload = { sessionId, bet }
      const r = await fetchProviderJson<PlayResponse>("/v1/public/play", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      const winNum = toNumber((r as any)?.win, 0)
      const balNum = toNumber((r as any)?.balance, 0)

      setWin(winNum)
      setBalance(balNum)

      const rawSymbols = (r as any)?.provider?.result?.symbols
      const fallback = grid.length === 15 ? grid : Array.from({ length: 15 }, () => "")
      const normalized = normalizeSymbols(rawSymbols, fallback)

      // If provider returned relative paths, normalize to absolute
      const finalGrid = normalized.flat.map((s) => {
        if (!s) return ""
        // if already absolute http(s), keep
        if (/^https?:\/\//i.test(s)) return s
        // else treat as provider asset path
        return joinUrl(providerBaseUrl, s)
      })

      runSpinAnimation(finalGrid)
    } catch (e: any) {
      setErr(e?.message || "Spin failed")
    } finally {
      // allow animation to finish a bit
      window.setTimeout(() => setIsSpinning(false), 450)
    }
  }

  const title = game ? `ZENYX • ${game.name}` : "ZENYX • Play"
  const subtitle = game ? `${game.kind} • Session: ${sessionId}` : `Session: ${sessionId}`

  return (
    <div className="min-h-[100dvh] text-white">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: coverBg ? `url(${coverBg})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(0px)"
        }}
      />
      <div className="fixed inset-0 -z-10 bg-black/65" />

      {/* Header (NO SPIN HERE) */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-semibold tracking-wide">{title}</div>
            <div className="text-xs text-white/70 break-all">{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            ← Lobby
          </button>
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </div>

      {/* Game Stage */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-40">
        <div
          className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur-md p-3"
          style={{
            height: "calc(100dvh - 240px)",
            minHeight: 340,
            maxHeight: 620
          }}
        >
          {/* Slot Grid */}
          <div className="h-full w-full rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-center">
            <div className="w-full overflow-x-auto">
              {/* The 5 reels stay 5; small screens can scroll horizontally */}
              <div
                className="grid gap-2 mx-auto"
                style={{
                  gridTemplateColumns: "repeat(5, minmax(74px, 1fr))",
                  maxWidth: 980
                }}
              >
                {grid.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl bg-black/25 border border-white/10 overflow-hidden flex items-center justify-center"
                  >
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-contain p-[clamp(6px,1.2vw,12px)] select-none"
                      />
                    ) : (
                      <div className="w-full h-full opacity-40" />
                    )}
                  </div>
                ))}
              </div>

              {/* optional hint */}
              <div className="mt-2 text-center text-xs text-white/50">
                {game?.kind === "SLOT" ? "5 reels • 3 rows" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer Controls (ONLY SPIN HERE) */}
      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto w-full max-w-6xl px-3 pb-3">
          <div className="rounded-3xl border border-white/10 bg-black/45 backdrop-blur-md p-3">
            <div className="grid grid-cols-3 gap-2">
              {/* BET */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] text-white/70">BET</div>
                <div className="mt-1 text-xl font-semibold">{bet}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 2, 5, 10].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBet(v)}
                      className={[
                        "h-10 w-10 rounded-full border text-sm font-semibold",
                        v === bet
                          ? "border-purple-400 bg-purple-500/80"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      ].join(" ")}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* WIN */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] text-white/70">WIN</div>
                <div className="mt-1 text-xl font-semibold">{win}</div>
              </div>

              {/* BALANCE */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] text-white/70">BALANCE</div>
                <div className="mt-1 text-xl font-semibold">
                  {balance} <span className="text-sm text-white/70">BRL</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isSpinning}
              onClick={spin}
              className={[
                "mt-3 w-full rounded-2xl py-4 text-lg font-bold tracking-wide",
                isSpinning
                  ? "bg-purple-500/50 cursor-not-allowed"
                  : "bg-purple-500 hover:bg-purple-400"
              ].join(" ")}
            >
              {isSpinning ? "SPINNING..." : "SPIN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
