"use client"

import { useMemo, useState } from "react"

export default function PlayPage({
  searchParams
}: {
  searchParams: { gameCode?: string }
}) {
  const gameCode = useMemo(() => searchParams.gameCode || "", [searchParams.gameCode])

  const [email, setEmail] = useState("test@zenyx.com")
  const [password, setPassword] = useState("123456")
  const [token, setToken] = useState<string>("")
  const [sessionId, setSessionId] = useState<string>("")
  const [bet, setBet] = useState<number>(1)
  const [out, setOut] = useState<any>(null)
  const [err, setErr] = useState<string>("")

  const login = async () => {
    setErr("")
    setOut(null)
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data?.error || "Login failed")
      return
    }
    setToken(data.token)
  }

  const createSession = async () => {
    setErr("")
    setOut(null)
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameCode })
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data?.error || "Session failed")
      setOut(data)
      return
    }
    setSessionId(data.sessionId || data?.sessionId || data?.id || "")
    setOut(data)
  }

  const spin = async () => {
    setErr("")
    setOut(null)
    if (!token) {
      setErr("Login d'abord (token manquant).")
      return
    }
    if (!sessionId) {
      setErr("Crée une session d'abord.")
      return
    }

    const res = await fetch("/api/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId, gameCode, bet })
    })

    const data = await res.json()
    if (!res.ok) {
      setErr(data?.error || "Spin failed")
      setOut(data)
      return
    }
    setOut(data)
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 6 }}>Play</h1>
      <div style={{ opacity: 0.8, marginBottom: 18 }}>gameCode: <b>{gameCode}</b></div>

      <section style={{ background: "#111827", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Auth</h3>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr auto" }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
          <button onClick={login} style={{ padding: "8px 12px" }}>Login</button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          Token: {token ? token.slice(0, 22) + "..." : "(none)"}
        </div>
      </section>

      <section style={{ background: "#111827", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Session & Spin</h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={createSession} style={{ padding: "8px 12px" }}>
            Create Session
          </button>

          <div style={{ opacity: 0.85 }}>
            sessionId: <b>{sessionId || "-"}</b>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <label>Bet</label>
            <input
              type="number"
              value={bet}
              min={0.01}
              step={0.01}
              onChange={(e) => setBet(Number(e.target.value))}
              style={{ width: 120 }}
            />
            <button onClick={spin} style={{ padding: "8px 12px", background: "#7c3aed", color: "white", border: 0, borderRadius: 8 }}>
              Spin
            </button>
          </div>
        </div>
      </section>

      {err && (
        <div style={{ background: "#7f1d1d", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          {err}
        </div>
      )}

      <section style={{ background: "#0b1220", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Log JSON</h3>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {out ? JSON.stringify(out, null, 2) : "—"}
        </pre>
      </section>
    </main>
  )
}
