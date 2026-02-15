"use client"

import { useEffect, useState } from "react"

const PROVIDER_BASE_URL =
  "https://zenyx-games-provider-production.up.railway.app"

const PUBLIC_TOKEN = "zenyx_public_prod_172839"
const OPERATOR_KEY = "op_4acd0c3c68cc869188e322ef60b4ab2e"

type Game = {
  id: string
  name: string
  kind: string
  rtp: number
  volatility?: string
  assets: {
    cover: string
    background?: string
    symbols?: string[]
  }
}

export default function LobbyPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGames()
  }, [])

  async function loadGames() {
    try {
      const res = await fetch(
        `${PROVIDER_BASE_URL}/v1/public/games`,
        {
          headers: {
            "x-public-token": PUBLIC_TOKEN,
            "x-operator-key": OPERATOR_KEY,
          },
        }
      )

      if (!res.ok) {
        throw new Error("Failed to load games")
      }

      const data = await res.json()
      setGames(data)
    } catch (err) {
      setError("Unable to load games")
    } finally {
      setLoading(false)
    }
  }

  async function openGame(gameCode: string) {
    try {
      const res = await fetch(
        `${PROVIDER_BASE_URL}/v1/public/session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-public-token": PUBLIC_TOKEN,
            "x-operator-key": OPERATOR_KEY,
          },
          body: JSON.stringify({
            gameCode,
            playerExternalId: "player_demo_123",
            currency: "BRL",
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        alert("Unable to create session")
        return
      }

      // 🚀 IMPORTANT : utiliser launchUrl tel quel
      window.location.href = data.launchUrl

    } catch (err) {
      console.error(err)
      alert("Connection error")
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f0f14",
        padding: "40px 20px",
        color: "white",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "40px",
          fontSize: "32px",
          letterSpacing: "2px",
        }}
      >
        🎰 ZENYX GAMES
      </h1>

      {loading && <p style={{ textAlign: "center" }}>Loading games...</p>}
      {error && <p style={{ textAlign: "center", color: "red" }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "24px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {games.map((game) => (
          <div
            key={game.id}
            onClick={() => openGame(game.id)}
            style={{
              background: "#1a1a22",
              borderRadius: "14px",
              overflow: "hidden",
              cursor: "pointer",
              transition: "transform 0.2s ease",
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "scale(1)")
            }
          >
            <img
              src={`${PROVIDER_BASE_URL}${game.assets.cover}`}
              alt={game.name}
              style={{
                width: "100%",
                height: "240px",
                objectFit: "cover",
                display: "block",
              }}
            />

            <div style={{ padding: "16px" }}>
              <h3 style={{ margin: 0 }}>{game.name}</h3>
              <p style={{ margin: "6px 0", fontSize: "14px", opacity: 0.7 }}>
                Type: {game.kind}
              </p>
              <p style={{ margin: 0, fontSize: "14px", opacity: 0.7 }}>
                RTP: {game.rtp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
