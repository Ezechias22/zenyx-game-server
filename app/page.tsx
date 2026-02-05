"use client";

import React, { useEffect, useState } from "react";

type Game = { id: string; kind: string; rtp: number };

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/games", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "games error");
      setGames(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "games error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", color: "white", background: "#0b0f1a", minHeight: "100vh" }}>
      <h1 style={{ margin: 0 }}>ZENYX Game Server</h1>
      <p style={{ opacity: 0.8 }}>Ouvre /play?sessionId=... dans un iframe pour lancer un jeu.</p>

      {error ? <div style={{ color: "tomato" }}>❌ {error}</div> : null}

      <button onClick={load} style={{ padding: "10px 12px", borderRadius: 12 }}>
        Rafraîchir la liste
      </button>

      <h2>Jeux disponibles</h2>
      <ul>
        {games.map((g) => (
          <li key={g.id}>
            <b>{g.id}</b> — {g.kind} — RTP {g.rtp}
          </li>
        ))}
      </ul>
    </div>
  );
}
