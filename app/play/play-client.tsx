"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"

type ProviderGame = {
  id?: string
  code?: string
  gameCode?: string
  name?: string
  kind?: string
  assets?: { cover?: string; background?: string; symbols?: string[] }
}

type SpinResult = {
  sessionId?: string
  gameCode?: string
  bet?: number
  win?: number
  balance?: number | { balance?: number }
  result?: { symbols?: string[] }
  symbols?: string[]
}

function safeNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeGrid(symbols: string[], cols = 5, rows = 3) {
  const out: string[] = []
  if (!symbols.length) return out
  for (let i = 0; i < cols * rows; i++) out.push(pick(symbols))
  return out
}

export default function PlayClient({
  sessionId,
  gameCode,
}: {
  sessionId: string
  gameCode: string
}) {
  const [games, setGames] = useState<ProviderGame[]>([])
  const [loading, setLoading] = useState(true)

  const [bet, setBet] = useState(1)
  const [win, setWin] = useState(0)
  const [balance, setBalance] = useState(0)

  const [spinning, setSpinning] = useState(false)
  const [flashWin, setFlashWin] = useState(false)

  const [grid, setGrid] = useState<string[]>([])
  const [symbolsCatalog, setSymbolsCatalog] = useState<string[]>([])
  const flashTimer = useRef<number | null>(null)

  // ✅ charge le catalog depuis notre server (déjà headers côté server)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetch("/api/games", { cache: "no-store" })
      const json = await res.json().catch(() => [])
      if (cancelled) return

      const list: ProviderGame[] = Array.isArray(json) ? json : Array.isArray(json?.games) ? json.games : []
      setGames(list)
      setLoading(false)
    })()
    return () => {
      cancelled = true
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  const game = useMemo(() => {
    if (!gameCode) return undefined
    const found = games.find((g) => (g.id ?? g.code ?? g.gameCode) === gameCode)
    return found
  }, [games, gameCode])

  const backgroundPath = game?.assets?.background ?? ""
  const symbols = game?.assets?.symbols ?? []

  // ✅ preload + grille initiale dès ouverture
  useEffect(() => {
    if (!symbols?.length) return
    setSymbolsCatalog(symbols)

    // Preload images via proxy same-origin pour éviter NotSameOrigin
    for (const p of symbols) {
      const img = new window.Image()
      img.src = `/api/assets?path=${encodeURIComponent(p)}`
    }

    // Grille initiale immédiate (plus de "...")
    setGrid(makeGrid(symbols, 5, 3))
  }, [symbols?.length])

  const title = game?.name ?? (gameCode || "ZENYX • PLAY")
  const kind = game?.kind ?? "SLOT"

  async function doSpin() {
    if (!sessionId || spinning) return
    setSpinning(true)

    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, bet }),
      })

      const json: SpinResult = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error("Spin failed")

      const nextWin = safeNumber(json.win, 0)

      // ✅ balance peut être number OU objet
      const bal =
        typeof json.balance === "number"
          ? json.balance
          : safeNumber((json.balance as any)?.balance, balance)

      setWin(nextWin)
      setBalance(bal)

      // ✅ provider peut renvoyer result.symbols OU symbols direct
      const nextSymbols =
        (Array.isArray(json.result?.symbols) ? json.result?.symbols : null) ??
        (Array.isArray(json.symbols) ? json.symbols : null)

      if (nextSymbols?.length) {
        setGrid(nextSymbols.slice(0, 15))
      } else if (symbolsCatalog.length) {
        setGrid(makeGrid(symbolsCatalog, 5, 3))
      }

      if (nextWin > 0) {
        setFlashWin(true)
        if (flashTimer.current) window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setFlashWin(false), 800)
      }
    } catch {
      // fallback visuel si erreur
      if (symbolsCatalog.length) setGrid(makeGrid(symbolsCatalog, 5, 3))
    } finally {
      setSpinning(false)
    }
  }

  const bgUrl = backgroundPath
    ? `/api/assets?path=${encodeURIComponent(backgroundPath)}`
    : ""

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* Background */}
      {bgUrl ? (
        <div className="pointer-events-none fixed inset-0">
          <Image
            src={bgUrl}
            alt=""
            fill
            priority={false}
            className="object-cover opacity-35 blur-[0.5px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/85" />
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-[#070A12] to-black" />
      )}

      {/* Top bar */}
      <div className="relative mx-auto max-w-6xl px-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-white/60">ZENYX</div>
            <div className="text-xl font-semibold tracking-tight">{title}</div>
            <div className="text-xs text-white/60">
              {kind} • Session: <span className="text-white/80">{sessionId || "—"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              ← Lobby
            </a>

            <button
              onClick={doSpin}
              disabled={!sessionId || spinning}
              className="rounded-full bg-[#7C3AED] px-5 py-2 text-sm font-semibold shadow-[0_16px_40px_rgba(124,58,237,.35)] disabled:opacity-50"
            >
              {spinning ? "SPIN…" : "SPIN"}
            </button>
          </div>
        </div>
      </div>

      {/* Game frame (style iframe pro) */}
      <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-4">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,.55)]">
          <div className="p-4 sm:p-5">
            {/* Reels grid */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {(grid.length ? grid : Array.from({ length: 15 }).map(() => "")).map((p, i) => {
                  const src = p ? `/api/assets?path=${encodeURIComponent(p)}` : ""
                  return (
                    <div
                      key={i}
                      className={`relative aspect-[1/1] overflow-hidden rounded-xl border border-white/10 bg-black/30 ${
                        flashWin ? "ring-2 ring-[#F59E0B] shadow-[0_0_35px_rgba(245,158,11,.25)]" : ""
                      }`}
                    >
                      {src ? (
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="20vw"
                          className="object-contain p-2"
                          priority={false}
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-white/20">•</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer (comme ton exemple pro) */}
      <footer className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-3xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,.65)]">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* BET */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold text-white/60">BET</div>
                <div className="mt-1 text-lg font-semibold">{bet}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 2, 5, 10].map((v) => (
                    <button
                      key={v}
                      onClick={() => setBet(v)}
                      className={`h-8 rounded-full px-3 text-sm font-semibold transition ${
                        bet === v ? "bg-[#7C3AED]" : "bg-white/10 hover:bg-white/15"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* WIN */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold text-white/60">WIN</div>
                <div className={`mt-1 text-lg font-semibold ${flashWin ? "text-[#F59E0B]" : ""}`}>
                  {win}
                </div>
                <div className="mt-2 text-xs text-white/60">Dernier gain</div>
              </div>

              {/* BALANCE */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold text-white/60">SOLDE</div>
                <div className="mt-1 text-lg font-semibold">
                  {balance} <span className="text-sm text-white/60">BRL</span>
                </div>
                <div className="mt-2 text-xs text-white/60">Balance joueur</div>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={doSpin}
                disabled={!sessionId || spinning}
                className="w-full rounded-2xl bg-[#7C3AED] py-3 text-base font-semibold shadow-[0_18px_60px_rgba(124,58,237,.35)] disabled:opacity-50"
              >
                {spinning ? "SPIN…" : "SPIN"}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Simple states */}
      {loading ? (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 mx-auto max-w-6xl px-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/70 backdrop-blur">
            Chargement…
          </div>
        </div>
      ) : null}

      {!sessionId ? (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center px-4">
          <div className="max-w-md rounded-3xl border border-white/10 bg-black/65 p-6 text-center backdrop-blur-xl">
            <div className="text-lg font-semibold">Session manquante</div>
            <div className="mt-2 text-sm text-white/70">
              Ouvre un jeu depuis le lobby (ou via le launchUrl du provider).
            </div>
            <a
              href="/"
              className="pointer-events-auto mt-4 inline-flex rounded-full bg-white/10 px-5 py-2 text-sm font-semibold hover:bg-white/15"
            >
              Retour Lobby
            </a>
          </div>
        </div>
      ) : null}
    </main>
  )
}
