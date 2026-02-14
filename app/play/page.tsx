"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

type PlayResult = {
  win?: number
  balance?: number
}

export default function PlayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sessionId = useMemo(() => {
    const s = searchParams.get("sessionId")
    return s && s.length >= 10 ? s : null
  }, [searchParams])

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PlayResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      router.replace("/")
    }
  }, [sessionId, router])

  async function spin() {
    if (!sessionId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_PROVIDER_BASE_URL}/v1/public/play`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-public-token": process.env.NEXT_PUBLIC_PUBLIC_TOKEN!,
            "x-operator-key": process.env.NEXT_PUBLIC_OPERATOR_KEY!
          },
          body: JSON.stringify({
            sessionId,
            bet: 1
          })
        }
      )

      if (!res.ok) {
        throw new Error("Spin failed")
      }

      const data = await res.json()
      setResult({
        win: data.win,
        balance: data.balance
      })
    } catch {
      setError("Spin error")
    } finally {
      setLoading(false)
    }
  }

  if (!sessionId) return null

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        color: "#fff"
      }}
    >
      <button
        onClick={spin}
        disabled={loading}
        style={{
          padding: "14px 28px",
          background: "#7c3aed",
          border: "none",
          borderRadius: "10px",
          fontSize: "18px",
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        {loading ? "Spinning..." : "SPIN"}
      </button>

      {result && (
        <div style={{ marginTop: "20px", fontSize: "20px" }}>
          Win: {result.win ?? 0} | Balance: {result.balance ?? 0}
        </div>
      )}

      {error && (
        <div style={{ marginTop: "20px", color: "red" }}>
          {error}
        </div>
      )}
    </main>
  )
}
