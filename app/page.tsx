"use client";

import React, { useEffect, useState } from "react";

type Game = { id: string; kind: string; rtp: number };

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [playerExternalId, setPlayerExternalId] = useState("player_demo_123");
  const [currency, setCurrency] = useState("BRL");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/games", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        setGames(data.games);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>ZENYX Game Server</h1>

      <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
        En production, ton casino ouvre directement l'URL{" "}
        <code style={{ padding: "2px 6px", borderRadius: 6, background: "rgba(255,255,255,0.08)" }}>
          /play?sessionId=...
        </code>{" "}
        dans un iframe.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>playerExternalId</span>
          <input
            value={playerExternalId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerExternalId(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>currency</span>
          <input
            value={currency}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrency(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <h2 style={{ marginTop: 22 }}>Jeux disponibles</h2>

      {loading && <div style={{ opacity: 0.8 }}>Chargement...</div>}
      {err && <div style={{ color: "#ff7b7b" }}>Erreur: {err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {games.map((g) => (
          <div key={g.id} style={cardStyle}>
            <div style={{ fontWeight: 700 }}>{g.id}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Type: {g.kind}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>RTP: {(g.rtp * 100).toFixed(2)}%</div>

            <button
              style={btnStyle}
              onClick={async () => {
                const res = await fetch("/api/session", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ gameCode: g.id, playerExternalId, currency }),
                });
                const data = await res.json();
                if (!res.ok) {
                  alert("Erreur session: " + JSON.stringify(data));
                  return;
                }
                window.location.href = data.playUrl;
              }}
            >
              Ouvrir (create session)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  minWidth: 260
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 8
};

const btnStyle: React.CSSProperties = {
  marginTop: 8,
  border: "none",
  borderRadius: 12,
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 700
};
