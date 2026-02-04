"use client";

import React, { useEffect, useState } from "react";

export default function PlayClient({ sessionId }: { sessionId: string }) {
  const [bet, setBet] = useState<string>("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) setErr("Missing sessionId in URL");
  }, [sessionId]);

  async function spin() {
    setErr(null);
    setLoading(true);
    try {
      const betNum = Number(bet);
      if (!Number.isFinite(betNum) || betNum <= 0) throw new Error("Bet must be > 0");

      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, bet: betNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setResult(data);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={topBar}>
        <div>
          <div style={{ fontWeight: 800 }}>ZENYX</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>session: {sessionId || "-"}</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.75 }}>Bet</span>
            <input
              value={bet}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBet(e.target.value)}
              style={inputStyle}
            />
          </label>

          <button disabled={loading || !sessionId} onClick={spin} style={btnStyle}>
            {loading ? "..." : "SPIN"}
          </button>
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff7b7b" }}>Erreur: {err}</div>}

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <div style={panelStyle}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Résultat</div>
          <pre style={preStyle}>{JSON.stringify(result, null, 2)}</pre>
        </div>

        <div style={panelStyle}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Note</div>
          <div style={{ opacity: 0.85, lineHeight: 1.5 }}>
            Cette UI est affichée dans un <b>iframe</b> chez l'opérateur. Les secrets (public token / operator key) ne
            sont jamais envoyés au navigateur: ils restent côté serveur dans <code>/api/*</code>.
          </div>
        </div>
      </div>
    </div>
  );
}

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)"
};

const panelStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)"
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  width: 130
};

const btnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 800
};

const preStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  background: "rgba(0,0,0,0.35)",
  borderRadius: 10,
  padding: 12,
  overflow: "auto"
};
