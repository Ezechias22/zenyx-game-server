"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Game = { id: string; kind: string; rtp: number };

export default function PlayClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const sessionId = sp.get("sessionId") || "";
  const gameCode = sp.get("gameCode") || ""; // IMPORTANT
  const playerExternalId = sp.get("playerExternalId") || "player_demo_123";
  const currency = sp.get("currency") || "BRL";

  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState<string>("");

  const [bet, setBet] = useState<number>(1);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const selectedGame = useMemo(() => games.find((g) => g.id === gameCode) || null, [games, gameCode]);

  async function refreshGames() {
    setLoadingGames(true);
    setError("");
    try {
      const res = await fetch("/api/games", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "games error");
      setGames(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "games error");
    } finally {
      setLoadingGames(false);
    }
  }

  useEffect(() => {
    refreshGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openGame(g: Game) {
    setError("");
    setResult(null);

    // ✅ on crée une session côté provider (donc nouveau sessionId)
    try {
      console.log("OPEN GAME CLICK", g.id);

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameCode: g.id,
          playerExternalId,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "session error");

      const newSessionId = String(data?.sessionId || "");
      if (!newSessionId) throw new Error("Missing sessionId from /api/session");

      // ✅ IMPORTANT : on met aussi gameCode dans l’URL
      router.push(
        `/play?sessionId=${encodeURIComponent(newSessionId)}&gameCode=${encodeURIComponent(g.id)}&playerExternalId=${encodeURIComponent(
          playerExternalId
        )}&currency=${encodeURIComponent(currency)}`
      );
    } catch (e: any) {
      setError(e?.message || "openGame error");
    }
  }

  async function spin() {
    setError("");
    setResult(null);

    if (!sessionId) {
      setError("Missing sessionId in URL");
      return;
    }
    if (!gameCode) {
      setError("Missing gameCode (sélectionne un jeu)");
      return;
    }

    setSpinning(true);
    try {
      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          bet,
          // gameCode n’est pas obligatoire côté provider (il est dans la session Redis),
          // mais on le garde pour debug côté UI
          gameCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "play error");

      setResult(data);
    } catch (e: any) {
      setError(e?.message || "play error");
    } finally {
      setSpinning(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
    background: "rgba(255,255,255,0.04)",
  };

  const btn: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", color: "white", background: "#0b0f1a", minHeight: "100vh" }}>
      <h1 style={{ margin: 0 }}>🎰 ZENYX Game Server</h1>
      <p style={{ opacity: 0.8 }}>
        En production, ton casino ouvre directement l’URL <b>/play?sessionId=...</b> dans un iframe.
      </p>

      {error ? (
        <div style={{ ...cardStyle, borderColor: "rgba(255,0,0,0.4)", background: "rgba(255,0,0,0.06)", marginBottom: 12 }}>
          ❌ {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div style={cardStyle}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Session</div>
          <div style={{ opacity: 0.85, wordBreak: "break-all" }}>{sessionId || "— (aucune session)"}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button style={btn} onClick={refreshGames} disabled={loadingGames}>
              {loadingGames ? "Chargement..." : "Rafraîchir la liste"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Jeu sélectionné</div>
          <div style={{ opacity: 0.9 }}>{gameCode ? <b>{gameCode}</b> : "— Choisir un jeu —"}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Bet:</div>
            <input
              value={String(bet)}
              onChange={(e) => setBet(Number(e.target.value || 0))}
              type="number"
              min={0.01}
              step={0.01}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "white" }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <button style={{ ...btn, width: "100%" }} onClick={spin} disabled={spinning}>
              {spinning ? "SPIN..." : "SPIN"}
            </button>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 0 }}>Jeux disponibles</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {(games || []).map((g) => (
          <div key={g.id} style={cardStyle}>
            <div style={{ fontWeight: 800 }}>{g.id}</div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>Type: {g.kind}</div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>RTP: {g.rtp}</div>
            <div style={{ marginTop: 10 }}>
              <button style={{ ...btn, width: "100%" }} onClick={() => openGame(g)}>
                Ouvrir
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>Résultat</h2>
      <div style={cardStyle}>
        {result ? <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(result, null, 2)}</pre> : "—"}
      </div>
    </div>
  );
}
