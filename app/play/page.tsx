"use client"

import { useState } from "react"

export default function PlayPage({
  searchParams
}: {
  searchParams: { gameCode: string }
}) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [bet, setBet] = useState(1)
  const [result, setResult] = useState<any>(null)

  const createSession = async () => {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameCode: searchParams.gameCode })
    })

    const data = await res.json()
    setSessionId(data.sessionId)
  }

  const spin = async () => {
    const res = await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        gameCode: searchParams.gameCode,
        bet,
        userId: "test-user-id"
      })
    })

    const data = await res.json()
    setResult(data)
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Game: {searchParams.gameCode}</h1>

      <button onClick={createSession}>Create Session</button>

      <div style={{ marginTop: 20 }}>
        <input
          type="number"
          value={bet}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        <button onClick={spin}>Spin</button>
      </div>

      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  )
}
