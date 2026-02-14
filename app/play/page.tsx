import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type ProviderResponse = {
  win?: number
  balance?: number
  playerExternalId?: string
  currency?: string
}

async function spinRequest(sessionId: string): Promise<ProviderResponse> {
  const res = await fetch(
    `${process.env.PROVIDER_BASE_URL}/v1/public/play`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-public-token": process.env.PUBLIC_TOKEN!,
        "x-operator-key": process.env.OPERATOR_KEY!
      },
      body: JSON.stringify({
        sessionId,
        bet: 1
      }),
      cache: "no-store"
    }
  )

  if (!res.ok) {
    throw new Error("Spin failed")
  }

  return res.json()
}

export default async function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string; spin?: string }
}) {
  const sessionId =
    searchParams.sessionId && searchParams.sessionId.length >= 10
      ? searchParams.sessionId
      : null

  if (!sessionId) {
    redirect("/")
  }

  let result: ProviderResponse | null = null

  if (searchParams.spin === "1") {
    result = await spinRequest(sessionId)
  }

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
      <a
        href={`/play?sessionId=${sessionId}&spin=1`}
        style={{
          padding: "14px 28px",
          background: "#7c3aed",
          borderRadius: "10px",
          fontSize: "18px",
          fontWeight: 700,
          textDecoration: "none",
          color: "#fff"
        }}
      >
        SPIN
      </a>

      {result && (
        <div style={{ marginTop: "20px", fontSize: "20px" }}>
          <div>Win: {result.win ?? 0}</div>
          <div>Balance: {result.balance ?? 0}</div>
          <div>Currency: {result.currency ?? "BRL"}</div>
        </div>
      )}
    </main>
  )
}
