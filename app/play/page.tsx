import { redirect } from "next/navigation"
import PlayClient from "./play-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  assets?: { cover?: string; background?: string; symbols?: string[] }
}

async function getGames(): Promise<Game[]> {
  const base = (process.env.PROVIDER_BASE_URL || "").replace(/\/+$/, "")
  const res = await fetch(`${base}/v1/public/games`, {
    headers: {
      "x-public-token": process.env.PUBLIC_TOKEN!,
      "x-operator-key": process.env.OPERATOR_KEY!
    },
    cache: "no-store"
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  return Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : []
}

export default async function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string }
}) {
  const sessionId =
    searchParams.sessionId && searchParams.sessionId.length >= 10 ? searchParams.sessionId : ""
  if (!sessionId) redirect("/")

  const games = await getGames()

  // sessionId alone doesn't tell gameCode; provider /v1/launch will iframe back here with sessionId
  // We still render a stage UI; background will be generic.
  const bg = "radial-gradient(1200px 700px at 20% 0%, rgba(124,58,237,0.18), transparent 60%), #0b0f1a"

  return <PlayClient sessionId={sessionId} backgroundStyle={bg} />
}
