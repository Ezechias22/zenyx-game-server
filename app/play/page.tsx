import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type SessionResponse = {
  sessionId: string
  launchUrl: string
  ttlSec: number
}

async function createSession(gameCode: string): Promise<SessionResponse> {
  const res = await fetch(
    `${process.env.PROVIDER_BASE_URL}/v1/public/session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-public-token": process.env.PUBLIC_TOKEN!,
        "x-operator-key": process.env.OPERATOR_KEY!,
      },
      body: JSON.stringify({
        gameCode,
        playerExternalId: "player_demo_123",
        currency: "BRL",
      }),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error("Failed to create session")
  }

  return res.json()
}

export default async function PlayPage({
  searchParams,
}: {
  searchParams: { gameCode?: string }
}) {
  if (!searchParams.gameCode) {
    redirect("/")
  }

  const session = await createSession(searchParams.gameCode)

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        margin: 0,
        padding: 0,
      }}
    >
      <iframe
        src={session.launchUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        allow="autoplay; fullscreen"
      />
    </div>
  )
}
