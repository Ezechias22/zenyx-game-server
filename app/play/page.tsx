"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PlayResult } from "@/src/lib/types";
import { mapBackendSymbolToAsset } from "@/src/lib/symbols";

type ReelSymbol = { assetUrl: string };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

type Payline = 0 | 1 | 2; // 0=top, 1=mid, 2=bottom

export default function PlayPage() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId") || "";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const fxAnimRef = useRef<number | null>(null);

  const [bet, setBet] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<PlayResult | null>(null);

  // 3 reels, each reel is a long strip of symbols
  const reelsRef = useRef<ReelSymbol[][]>([[], [], []]);

  // current offsets in "symbol units" (float)
  const offsetsRef = useRef<number[]>([0, 0, 0]);

  // loaded images cache
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});

  // spin controller
  const spinRef = useRef({
    spinning: false,
    t0: 0,
    durationMs: 1600,
    // final visible 3x3 grid (rows x reels) represented by assets
    finalGrid: [
      ["/symbols/wildcard.png", "/symbols/wildcard.png", "/symbols/wildcard.png"], // top row
      ["/symbols/wildcard.png", "/symbols/wildcard.png", "/symbols/wildcard.png"], // mid row
      ["/symbols/wildcard.png", "/symbols/wildcard.png", "/symbols/wildcard.png"], // bottom row
    ] as string[][],
    // winning lines computed after result
    winningLines: [] as Payline[],
    winFxUntil: 0,
  });

  const layout = useMemo(() => {
    return {
      width: 980,
      height: 560,
      padding: 28,
      reelW: 250,
      reelH: 300, // window height (3 symbols)
      gap: 24,
      left: 90,
      top: 140,
      symbolSize: 160,
      // 3 visible rows
      rowH: 100,
      // UI bars
      headerH: 86,
      footerY: 470,
    };
  }, []);

  function seedReelsFallback() {
    const fallback = [
      "/symbols/tiger.png",
      "/symbols/coin.png",
      "/symbols/lantern.png",
      "/symbols/drum.png",
      "/symbols/ingot.png",
      "/symbols/jade.png",
      "/symbols/wildcard.png",
    ];

    reelsRef.current = [0, 1, 2].map(() =>
      Array.from({ length: 32 }).map(() => ({
        assetUrl: fallback[Math.floor(Math.random() * fallback.length)],
      }))
    );

    offsetsRef.current = [5.2, 12.7, 18.4];
  }

  async function preloadAssets() {
    const assets = [
      "/symbols/tiger.png",
      "/symbols/coin.png",
      "/symbols/lantern.png",
      "/symbols/drum.png",
      "/symbols/ingot.png",
      "/symbols/jade.png",
      "/symbols/wildcard.png",
      "/ui/bg.jpg",
    ];

    const loaded: Record<string, HTMLImageElement> = {};
    for (const url of assets) {
      try {
        loaded[url] = await loadImage(url);
      } catch {
        // bg optional
      }
    }
    imagesRef.current = loaded;
  }

  // compute win lines: simple example
  // If middle row has 3 same symbols => win line 1
  // If top row has 3 same => win line 0
  // If bottom row has 3 same => win line 2
  function computeWinningLines(grid: string[][]): Payline[] {
    const wins: Payline[] = [];
    for (const line of [0, 1, 2] as Payline[]) {
      const a = grid[line][0];
      const b = grid[line][1];
      const c = grid[line][2];
      if (a && a === b && b === c) wins.push(line);
    }
    return wins;
  }

  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;

    // BG
    const bg = imagesRef.current["/ui/bg.jpg"];
    if (bg) {
      ctx.drawImage(bg, 0, 0, width, height);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#0b1224");
      grad.addColorStop(1, "#05060b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Header bar
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(layout.padding, 18, width - layout.padding * 2, layout.headerH);

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px system-ui";
    ctx.fillText("ZENYX SLOT (V2)", layout.padding + 18, 52);

    ctx.font = "14px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`Session: ${sessionId}`, layout.padding + 18, 78);

    // Win banner
    if (last) {
      const win = Number(last.win || 0);
      ctx.fillStyle = win > 0 ? "rgba(0,255,160,0.14)" : "rgba(255,255,255,0.04)";
      ctx.fillRect(layout.padding + 520, 30, width - (layout.padding + 520) - layout.padding, 62);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px system-ui";
      ctx.fillText(
        win > 0 ? `WIN: ${last.win} ${last.currency}` : `Last: bet ${last.bet} • win ${last.win}`,
        layout.padding + 540,
        62
      );

      ctx.font = "12px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(
        `Balance: ${last.balance?.balance ?? "?"} ${last.currency}`,
        layout.padding + 540,
        82
      );
    }

    // Cabinet frame
    const frameX = layout.left - 26;
    const frameY = layout.top - 26;
    const frameW = layout.reelW * 3 + layout.gap * 2 + 52;
    const frameH = layout.reelH + 52;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(frameX, frameY, frameW, frameH);

    ctx.strokeStyle = "rgba(255,215,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    // Draw reels (3 columns, 3 rows each)
    const offsets = offsetsRef.current;
    const grid = spinRef.current.finalGrid;

    const now = performance.now();
    const winGlow = spinRef.current.winningLines.length > 0 && now < spinRef.current.winFxUntil;

    for (let r = 0; r < 3; r++) {
      const reelX = layout.left + r * (layout.reelW + layout.gap);
      const reelY = layout.top;

      // reel window
      ctx.save();
      ctx.beginPath();
      ctx.rect(reelX, reelY, layout.reelW, layout.reelH);
      ctx.clip();

      // draw symbols in strip style, 3 rows
      // We draw 5 symbols vertically for smooth motion (centered around offset)
      const reel = reelsRef.current[r];
      const off = offsets[r];

      // symbol step is 1 unit, each unit = rowH pixels
      const centerIndex = Math.floor(off);
      const frac = off - centerIndex;

      // motion blur amount when spinning
      const blur = spinRef.current.spinning ? 0.55 : 0.0;

      for (let dy = -3; dy <= 3; dy++) {
        const idx = (centerIndex + dy + reel.length) % reel.length;
        const sym = reel[idx];
        const img = imagesRef.current[sym.assetUrl];

        const y = reelY + layout.reelH / 2 + (dy - frac) * layout.rowH;
        const x = reelX + layout.reelW / 2;

        const size = layout.symbolSize;

        if (img) {
          // blur by drawing twice with offset alpha
          if (blur > 0) {
            ctx.globalAlpha = 0.45;
            ctx.drawImage(img, x - size / 2, y - size / 2 - 10, size, size);
            ctx.globalAlpha = 0.55;
            ctx.drawImage(img, x - size / 2, y - size / 2 + 10, size, size);
            ctx.globalAlpha = 1;
          }

          ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.fillRect(x - 70, y - 70, 140, 140);
        }
      }

      ctx.restore();

      // reel border
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(reelX, reelY, layout.reelW, layout.reelH);

      // highlight win lines (on this reel) after settle
      const lines = spinRef.current.winningLines;

      if (lines.length) {
        for (const line of lines) {
          const lineY = reelY + line * layout.rowH + layout.rowH / 2;
          ctx.save();
          ctx.strokeStyle = winGlow ? "rgba(255,220,120,0.85)" : "rgba(255,220,120,0.55)";
          ctx.lineWidth = winGlow ? 8 : 5;
          ctx.beginPath();
          ctx.moveTo(reelX + 18, lineY);
          ctx.lineTo(reelX + layout.reelW - 18, lineY);
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    // if not spinning, draw the settled grid overlay “snap” to show exact final symbols
    // (this ensures the visible symbols match exactly the backend result)
    if (!spinRef.current.spinning && last?.result?.symbols?.length) {
      for (let r = 0; r < 3; r++) {
        const reelX = layout.left + r * (layout.reelW + layout.gap);
        const reelY = layout.top;

        // we only enforce middle row = backend symbols
        const midAsset = grid[1][r];
        const img = imagesRef.current[midAsset];
        if (img) {
          const x = reelX + layout.reelW / 2;
          const y = reelY + layout.rowH * 1 + layout.rowH / 2; // middle row center
          const size = layout.symbolSize;
          ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        }
      }
    }

    // footer hint
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(layout.padding, layout.footerY, width - layout.padding * 2, 70);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px system-ui";
    ctx.fillText("Paylines: top / middle / bottom. Win = 3 symbols identiques sur une ligne.", layout.padding + 18, layout.footerY + 28);
    ctx.fillText("Cette UI est un 'game client' (iframe). Le résultat provient de /api/play (provider).", layout.padding + 18, layout.footerY + 48);
  }

  // Confetti FX
  const confettiRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  function startConfetti() {
    const fx = fxCanvasRef.current;
    if (!fx) return;
    const W = fx.width;
    const H = fx.height;

    const parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * 80,
        y: layout.top + 20,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 6 - 3,
        life: 120 + Math.floor(Math.random() * 60),
      });
    }
    confettiRef.current = parts;

    const tick = () => {
      const c = fxCanvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, c.width, c.height);

      const arr = confettiRef.current;
      for (const p of arr) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.life -= 1;

        ctx.globalAlpha = clamp(p.life / 120, 0, 1);
        ctx.fillStyle = "rgba(255,215,0,0.9)";
        ctx.fillRect(p.x, p.y, 6, 3);
      }
      ctx.globalAlpha = 1;

      confettiRef.current = arr.filter((p) => p.life > 0 && p.y < c.height + 40);

      if (confettiRef.current.length > 0) {
        fxAnimRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, c.width, c.height);
      }
    };

    if (fxAnimRef.current) cancelAnimationFrame(fxAnimRef.current);
    fxAnimRef.current = requestAnimationFrame(tick);
  }

  function startLoop() {
    const tick = () => {
      const state = spinRef.current;

      if (state.spinning) {
        const t = performance.now();
        const elapsed = t - state.t0;
        const p = clamp(elapsed / state.durationMs, 0, 1);
        const e = easeOutCubic(p);

        // base speeds per reel + stagger stopping
        const base = [28, 34, 40];

        for (let r = 0; r < 3; r++) {
          // reel stops later for r=1,2
          const reelStopDelay = r * 160;
          const pr = clamp((elapsed - reelStopDelay) / state.durationMs, 0, 1);
          const er = easeOutCubic(pr);

          // speed decreases and then bounce to align
          const speed = base[r] * (1 - 0.72 * er);
          offsetsRef.current[r] += speed;

          if (pr >= 1) {
            // snap to match final grid middle symbol
            const reel = reelsRef.current[r];
            const midAsset = state.finalGrid[1][r];
            let idx = reel.findIndex((x) => x.assetUrl === midAsset);
            if (idx < 0) {
              idx = Math.floor(offsetsRef.current[r]) % reel.length;
              reel[idx] = { assetUrl: midAsset };
            }

            // add small bounce effect around idx (damped)
            const bounce = Math.sin((pr - 1) * 10) * 0.0; // pr==1 so 0
            offsetsRef.current[r] = idx + bounce;
          }
        }

        if (p >= 1) {
          state.spinning = false;
        }
      }

      drawFrame();
      animRef.current = requestAnimationFrame(tick);
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      seedReelsFallback();
      await preloadAssets();

      const c = canvasRef.current;
      if (c) {
        c.width = layout.width;
        c.height = layout.height;
      }
      const fx = fxCanvasRef.current;
      if (fx) {
        fx.width = layout.width;
        fx.height = layout.height;
      }

      startLoop();
    })();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (fxAnimRef.current) cancelAnimationFrame(fxAnimRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function spin() {
    if (!sessionId) {
      setError("Missing sessionId in URL");
      return;
    }
    setLoading(true);
    setError(null);

    // start spin now
    spinRef.current.spinning = true;
    spinRef.current.t0 = performance.now();
    spinRef.current.durationMs = 1600;
    spinRef.current.winningLines = [];

    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          bet,
          idempotencyKey: `spin_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || "Play failed");

      setLast(data);

      // Backend returns 3 symbols for the slot in your current engine
      const symbols = (data?.result?.symbols || []) as string[];

      // Map to assets for middle row (the paid line)
      const mid = symbols.slice(0, 3).map((s) => mapBackendSymbolToAsset(s));
      while (mid.length < 3) mid.push("/symbols/wildcard.png");

      // Build a 3x3 grid
      // top/bottom are randomized around same theme (but you can set them from backend later)
      const pool = [
        "/symbols/tiger.png",
        "/symbols/coin.png",
        "/symbols/lantern.png",
        "/symbols/drum.png",
        "/symbols/ingot.png",
        "/symbols/jade.png",
        "/symbols/wildcard.png",
      ];
      const top = [0, 1, 2].map(() => pool[Math.floor(Math.random() * pool.length)]);
      const bottom = [0, 1, 2].map(() => pool[Math.floor(Math.random() * pool.length)]);

      const grid = [top, mid, bottom];

      spinRef.current.finalGrid = grid;

      // compute winning lines (simple)
      const wins = computeWinningLines(grid);
      spinRef.current.winningLines = wins;

      const winAmount = Number(data?.win || 0);
      if (winAmount > 0 || wins.length > 0) {
        spinRef.current.winFxUntil = performance.now() + 1500;
        startConfetti();
      }
    } catch (e: any) {
      setError(e?.message || "Play error");
      spinRef.current.spinning = false;
    } finally {
      setLoading(false);
    }
  }

  if (!sessionId) {
    return (
      <main style={{ padding: 20, fontFamily: "system-ui", color: "#fff" }}>
        <h2>ZENYX Game Server</h2>
        <div style={{ color: "#ff6b6b" }}>Erreur: Missing sessionId in URL</div>
      </main>
    );
  }

  return (
    <main style={{ padding: 18, fontFamily: "system-ui", color: "#fff" }}>
      {error && <div style={{ color: "#ff6b6b", marginBottom: 10 }}>❌ {error}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Bet</div>
          <input
            value={bet}
            type="number"
            step="1"
            min="1"
            onChange={(e) => setBet(Number(e.target.value))}
            style={{ width: 140, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)" }}
          />
        </div>

        <button
          onClick={spin}
          disabled={loading}
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 10,
            border: "1px solid rgba(255,215,0,0.35)",
            background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,215,0,0.18)",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "SPIN..." : "SPIN"}
        </button>
      </div>

      <div style={{ position: "relative", width: layout.width, height: layout.height }}>
        <canvas
          ref={canvasRef}
          style={{
            width: layout.width,
            height: layout.height,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
            background: "#02040a",
            display: "block",
          }}
        />
        <canvas
          ref={fxCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: layout.width,
            height: layout.height,
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ marginTop: 14, opacity: 0.95 }}>
        <h3 style={{ marginBottom: 8 }}>Dernier résultat</h3>
        <pre style={{ background: "rgba(0,0,0,0.35)", padding: 12, borderRadius: 12, overflowX: "auto" }}>
{JSON.stringify(last, null, 2)}
        </pre>
      </div>
    </main>
  );
}
