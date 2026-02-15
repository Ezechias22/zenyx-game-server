"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Game = {
  id: string;
  name: string;
  kind: "SLOT" | "CRASH" | "DICE" | string;
  assets?: {
    cover?: string;
    background?: string;
    symbols?: string[];
  };
  ui?: {
    width?: number;
    height?: number;
    aspectRatio?: string;
  };
};

type PlayResult = {
  gameCode?: string;
  kind?: string;
  bet?: number;
  win?: number;
  balance?: number | { balance?: number };
  result?: {
    symbols?: string[]; // parfois le provider met ici
  };
  symbols?: string[]; // parfois le provider met ici
  nonce?: number;
};

const PROVIDER_BASE_URL = process.env.NEXT_PUBLIC_PROVIDER_BASE_URL; // optionnel si tu veux côté client

function absProviderUrl(path?: string) {
  const base =
    process.env.NEXT_PUBLIC_PROVIDER_BASE_URL ||
    "https://zenyx-games-provider-production.up.railway.app";
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return base.replace(/\/$/, "") + path;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildRandomGrid(symbols: string[], cols = 5, rows = 3) {
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) row.push(pick(symbols));
    grid.push(row);
  }
  return grid;
}

// Provider peut renvoyer 15 symbols en flat, ou 5x3 déjà.
function normalizeSymbolsToGrid(symbolsFlat: string[], cols = 5, rows = 3) {
  const s = symbolsFlat.slice(0, cols * rows);
  const grid: string[][] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) row.push(s[i++] ?? "");
    grid.push(row);
  }
  return grid;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PlayClient({
  sessionId,
  gameCode,
}: {
  sessionId: string;
  gameCode: string;
}) {
  const [games, setGames] = useState<Game[]>([]);
  const [game, setGame] = useState<Game | null>(null);

  const [bet, setBet] = useState<number>(1);
  const [win, setWin] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);

  const [grid, setGrid] = useState<string[][]>(() => [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ]);

  const [spinning, setSpinning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const symbols = useMemo(() => game?.assets?.symbols ?? [], [game]);
  const bgUrl = useMemo(
    () => absProviderUrl(game?.assets?.background),
    [game?.assets?.background]
  );

  const spinTimer = useRef<number | null>(null);

  // 1) charger catalog + game
  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setErrorMsg("");
      try {
        const r = await fetch(
          "https://zenyx-games-provider-production.up.railway.app/v1/public/games",
          {
            headers: {
              "x-public-token": "zenyx_public_prod_172839",
              "x-operator-key": "op_4acd0c3c68cc869188e322ef60b4ab2e",
            },
            cache: "no-store",
          }
        );

        const data = (await r.json()) as Game[];
        if (cancelled) return;

        setGames(data || []);
        const found =
          data?.find((g) => g.id === gameCode) ||
          data?.find((g) => g.id === (gameCode || "")) ||
          null;
        setGame(found);

        // 2) grille initiale immédiate (avant spin)
        const sym = found?.assets?.symbols ?? [];
        if (sym.length) setGrid(buildRandomGrid(sym, 5, 3));

        // prefetch symbols
        for (const p of sym.slice(0, 50)) {
          const img = new Image();
          img.src = absProviderUrl(p);
        }
      } catch (e: any) {
        setErrorMsg(e?.message || "Failed to load catalog");
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [gameCode]);

  // cleanup
  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearTimeout(spinTimer.current);
    };
  }, []);

  // bet controls
  const incBet = () => setBet((b) => clamp(b + 1, 1, 999));
  const decBet = () => setBet((b) => clamp(b - 1, 1, 999));

  async function doSpin() {
    if (!sessionId || sessionId.length < 10) {
      setErrorMsg("Session invalide.");
      return;
    }
    if (spinning) return;

    setErrorMsg("");
    setSpinning(true);

    // animation: shuffle rapide pendant 700ms
    if (symbols.length) {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        setGrid(buildRandomGrid(symbols, 5, 3));
        if (elapsed < 700) {
          spinTimer.current = window.setTimeout(tick, 60);
        }
      };
      tick();
    }

    try {
      const r = await fetch("/api/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, bet }),
      });

      const data = (await r.json()) as PlayResult | any;

      if (!r.ok || data?.error) {
        setErrorMsg(
          data?.body?.message?.[0] ||
            data?.body?.message ||
            "Spin failed (400)"
        );
        return;
      }

      const w = Number(data?.win ?? 0);
      const b =
        typeof data?.balance === "number"
          ? data.balance
          : Number(data?.balance?.balance ?? 0);

      setWin(w);
      setBalance(b);

      const symFlat =
        (Array.isArray(data?.result?.symbols) ? data.result.symbols : null) ||
        (Array.isArray(data?.symbols) ? data.symbols : null) ||
        [];

      // si provider renvoie 15 symbols -> grille directe
      if (symFlat.length >= 15) {
        setGrid(normalizeSymbolsToGrid(symFlat, 5, 3));
      } else if (symbols.length) {
        // fallback propre
        setGrid(buildRandomGrid(symbols, 5, 3));
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Spin failed");
    } finally {
      // stop animation
      if (spinTimer.current) window.clearTimeout(spinTimer.current);
      spinTimer.current = null;
      setSpinning(false);
    }
  }

  const title = game ? `ZENYX • ${game.name}` : "ZENYX • PLAY";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* overlay */}
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(80% 60% at 50% 0%, rgba(0,0,0,.35), rgba(0,0,0,.82))",
        }}
      >
        {/* top bar minimal */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "16px 14px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ color: "white" }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.6 }}>{title}</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Session: {sessionId || "—"}
            </div>
          </div>

          <a
            href="/"
            style={{
              color: "white",
              textDecoration: "none",
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.12)",
              padding: "10px 12px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            ← Lobby
          </a>
        </div>

        {/* reels area */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 14px 120px", // espace pour footer fixed (mobile)
          }}
        >
          <div
            style={{
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(10,14,24,.55)",
              boxShadow: "0 20px 60px rgba(0,0,0,.55)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 10,
                borderBottom: "1px solid rgba(255,255,255,.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ color: "rgba(255,255,255,.85)", fontWeight: 800 }}>
                SLOT
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,.65)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Symbols: {symbols.length || 0}
              </div>
            </div>

            {/* grid 5x3 responsive (mobile compact) */}
            <div
              style={{
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: 8, // moins écarté
                }}
              >
                {grid.flatMap((row, r) =>
                  row.map((cell, c) => {
                    const url = absProviderUrl(cell);
                    return (
                      <div
                        key={`${r}-${c}`}
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,.10)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
                          aspectRatio: "1 / 1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt="symbol"
                            draggable={false}
                            style={{
                              width: "clamp(38px, 6vw, 88px)", // plus petit sur mobile
                              height: "clamp(38px, 6vw, 88px)",
                              objectFit: "contain",
                              imageRendering: "auto",
                              userSelect: "none",
                              filter: spinning
                                ? "blur(0.3px) brightness(0.98)"
                                : "none",
                              transform: spinning
                                ? "translateY(2px) scale(0.98)"
                                : "none",
                              transition: "transform 120ms ease",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "clamp(20px, 4vw, 40px)",
                              height: "clamp(20px, 4vw, 40px)",
                              borderRadius: 10,
                              background: "rgba(255,255,255,.06)",
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {errorMsg ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: "rgba(255, 80, 80, .12)",
                    border: "1px solid rgba(255, 80, 80, .22)",
                    color: "rgba(255,255,255,.92)",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {String(errorMsg)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* footer fixed compact (mobile-friendly) */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "10px 12px",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.65) 18%, rgba(0,0,0,.92))",
          }}
        >
          <div
            className="zenyx-footer-grid"
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: 10,
              alignItems: "stretch",
            }}
          >
            {/* BET */}
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(10,14,24,.60)",
                padding: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,.65)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                }}
              >
                BET
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <button
                  onClick={decBet}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.06)",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  −
                </button>

                <div
                  style={{
                    color: "white",
                    fontWeight: 900,
                    fontSize: 18,
                    minWidth: 28,
                    textAlign: "center",
                  }}
                >
                  {bet}
                </div>

                <button
                  onClick={incBet}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.06)",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* WIN */}
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(10,14,24,.60)",
                padding: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,.65)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                }}
              >
                WIN
              </div>
              <div
                style={{
                  color: "white",
                  fontWeight: 900,
                  fontSize: 20,
                  marginTop: 6,
                }}
              >
                {Number.isFinite(win) ? win : 0}
              </div>
            </div>

            {/* BALANCE */}
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(10,14,24,.60)",
                padding: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,.65)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                }}
              >
                BALANCE
              </div>
              <div
                style={{
                  color: "white",
                  fontWeight: 900,
                  fontSize: 20,
                  marginTop: 6,
                }}
              >
                {Number.isFinite(balance) ? balance : 0}{" "}
                <span style={{ opacity: 0.7, fontSize: 14 }}>BRL</span>
              </div>
            </div>

            {/* SPIN */}
            <button
              onClick={doSpin}
              disabled={spinning}
              style={{
                alignSelf: "stretch",
                minWidth: 92,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,.14)",
                background: spinning
                  ? "linear-gradient(135deg, rgba(140,80,255,.55), rgba(90,140,255,.35))"
                  : "linear-gradient(135deg, rgba(155,90,255,.95), rgba(90,140,255,.75))",
                color: "white",
                fontWeight: 950,
                letterSpacing: 0.8,
                cursor: spinning ? "not-allowed" : "pointer",
                boxShadow: spinning
                  ? "0 0 0 rgba(0,0,0,0)"
                  : "0 12px 30px rgba(120,90,255,.30)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span style={{ position: "relative", zIndex: 2 }}>
                {spinning ? "SPIN…" : "SPIN"}
              </span>

              {/* ring animation */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: -40,
                  background:
                    "conic-gradient(from 180deg, rgba(255,255,255,.0), rgba(255,255,255,.22), rgba(255,255,255,0))",
                  opacity: spinning ? 1 : 0,
                  transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
                  transition: spinning ? "none" : "opacity 180ms ease",
                  animation: spinning ? "spinRing 900ms linear infinite" : "none",
                }}
              />
              <style>{`
                  @keyframes spinRing {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }

                  /* mobile: footer plus compact */
                  @media (max-width: 720px) {
                    .zenyx-footer-grid {
                      grid-template-columns: 1fr 1fr 1fr 88px !important;
                      gap: 8px !important;
                    }
                  }

                  /* très petit mobile: 2 lignes */
                  @media (max-width: 420px) {
                    .zenyx-footer-grid {
                      grid-template-columns: 1fr 1fr !important;
                    }
                  }
                `}</style>

            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
