"use client";

import { useEffect, useState } from "react";

type Game = { id: string; kind: string; rtp: number };

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 12,
  background: "rgba(0,0,0,0.25)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
};

export default function HomePage() {
  const [playerExternalId, setPlayerExternalId] = useState("player_demo_123");
  const [currency, setCurrency] = useState("BRL");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadGames() {
    setErr(null);
    try {
      const r = await fetch("/api/games", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to load games");
      setGames(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Load error");
      setGames([]);
    }
  }

  useEffect(() => {
    loadGames();
  }, []);

  async function openGame(gameCode: string) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameCode,
          playerExternalId,
          currency,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || data?.message || "Create session failed");

      const sessionId = data?.sessionId;
      if (!sessionId) throw new Error("No sessionId returned");

      window.location.href = `/play?sessionId=${encodeURIComponent(sessionId)}`;
    } catch (e: any) {
      setErr(e?.message || "Open error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20, fontFamily: "system-ui", color: "#fff", minHeight: "100vh", background: "linear-gradient(140deg,#0b1224,#06070d)" }}>
      <h1 style={{ marginTop: 0 }}>🎰 ZENYX Game Server</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>
        En production, ton casino ouvre directement l’URL <b>/play?sessionId=...</b> dans un iframe.
      </div>

      {err && <div style={{ color: "#ff6b6b", marginBottom: 10 }}>❌ {err}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>playerExternalId</div>
          <input value={playerExternalId} onChange={(e) => setPlayerExternalId(e.target.value)} style={{ width: 220, height: 34, borderRadius: 8 }} />
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>currency</div>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: 120, height: 34, borderRadius: 8 }} />
        </div>
        <button onClick={loadGames} style={{ height: 36 }}>
          Rafraîchir la liste
        </button>
      </div>

      <h2 style={{ marginTop: 0 }}>Jeux disponibles</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {games.map((g) => (
          <div key={g.id} style={cardStyle}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{g.id}</div>
            <div style={{ opacity: 0.85, fontSize: 12, marginTop: 6 }}>
              Type: {g.kind} • RTP: {g.rtp}
            </div>

            {/* Thumbnail placeholder (tu peux mettre tes vraies images par jeu ici) */}
            <div
              style={{
                marginTop: 10,
                height: 120,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "radial-gradient(circle at 30% 30%, rgba(255,215,0,0.18), rgba(0,0,0,0.12))",
              }}
            />

            <button
              disabled={loading}
              onClick={() => openGame(g.id)}
              style={{
                marginTop: 10,
                width: "100%",
                height: 36,
                borderRadius: 10,
                border: "1px solid rgba(255,215,0,0.35)",
                background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,215,0,0.18)",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Ouvrir
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
