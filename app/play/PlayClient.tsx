"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Game = { id: string; kind: string; rtp: number };

export default function PlayClient() {
  const sp = useSearchParams();
  const sessionId = sp.get("sessionId") || "";

  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [bet, setBet] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const headerNote = useMemo(() => {
    if (!sessionId) return "❌ Missing sessionId in URL";
    return `Session: ${sessionId}`;
  }, [sessionId]);

  async function refreshGames() {
    setError("");
    try {
      const r = await fetch("/api/games", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "games error");
      setGames(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e?.message || "games error");
      setGames([]);
    }
  }

  async function spin() {
    setError("");
    setLoading(true);
    setResult(null);

    try {
      if (!sessionId) throw new Error("Missing sessionId in URL");
      if (!selected) throw new Error("Choisis un jeu d’abord");

      const r = await fetch("/api/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, bet, gameCode: selected }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "play error");
      if (d?.error) throw new Error(d.error);
      setResult(d);
    } catch (e: any) {
      setError(e?.message || "play error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshGames();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ margin: 0 }}>🎰 ZENYX Game Server</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        En production, ton casino ouvre directement l’URL <code>/play?sessionId=...</code> dans un iframe.
      </p>

      <div style={{ marginTop: 10, padding: 10, border: "1px solid #333", borderRadius: 8 }}>
        <div style={{ fontWeight: 700 }}>{headerNote}</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={refreshGames} style={btn}>Rafraîchir la liste</button>

        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={select}>
          <option value="">— Choisir un jeu —</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.id} ({g.kind})
            </option>
          ))}
        </select>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ opacity: 0.7 }}>Bet:</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            style={input}
          />
        </label>

        <button onClick={spin} disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1 }}>
          {loading ? "SPIN..." : "SPIN"}
        </button>
      </div>

      {error && <div style={{ marginTop: 12, color: "#ff4d4d", fontWeight: 700 }}>❌ Erreur: {error}</div>}

      <h3 style={{ marginTop: 18 }}>Jeux disponibles</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {games.map((g) => (
          <div key={g.id} style={cardStyle}>
            <div style={{ fontWeight: 800 }}>{g.id}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Type: {g.kind}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>RTP: {g.rtp}</div>
            <button onClick={() => setSelected(g.id)} style={{ ...btn, marginTop: 10 }}>
              Ouvrir
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 18 }}>Résultat</h3>
      <pre style={preStyle}>{result ? JSON.stringify(result, null, 2) : "—"}</pre>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "#111",
  border: "1px solid #333",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const select: React.CSSProperties = {
  background: "#0b0b0b",
  color: "#fff",
  border: "1px solid #333",
  padding: "8px 10px",
  borderRadius: 8,
  minWidth: 260,
};

const input: React.CSSProperties = {
  background: "#0b0b0b",
  color: "#fff",
  border: "1px solid #333",
  padding: "8px 10px",
  borderRadius: 8,
  width: 110,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #333",
  borderRadius: 10,
  padding: 12,
  background: "#0b0b0b",
};

const preStyle: React.CSSProperties = {
  background: "#0b0b0b",
  border: "1px solid #333",
  borderRadius: 10,
  padding: 12,
  overflowX: "auto",
  minHeight: 90,
};
