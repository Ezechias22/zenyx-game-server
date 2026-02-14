import { redirect } from "next/navigation"
import PlayClient from "./play-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Game = {
  id: string
  name: string
  kind: string
  assets?: {
    cover?: string
    background?: string
    // provider may send symbols as:
    // - string[] (list of paths)
    // - Record<string,string> (map)
    // - { list: string[] } (wrapped)
    symbols?: unknown
  }
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

function normalizeSymbols(input: unknown): string[] {
  if (!input) return []

  // string[]
  if (Array.isArray(input)) {
    return input.filter((x) => typeof x === "string") as string[]
  }

  // { list: string[] } or { symbols: string[] }
  if (typeof input === "object" && input !== null) {
    const anyObj = input as Record<string, unknown>

    const maybeList = anyObj.list || anyObj.symbols
    if (Array.isArray(maybeList)) {
      return maybeList.filter((x) => typeof x === "string") as string[]
    }

    // map { wild: "/assets/.../wild.png", ... }
    const values = Object.values(anyObj).filter((v) => typeof v === "string") as string[]
    if (values.length) return values
  }

  return []
}

export default async function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string; gameCode?: string; launchUrl?: string }
}) {
  const sessionId =
    searchParams.sessionId && searchParams.sessionId.length >= 10 ? searchParams.sessionId : ""
  const gameCode = searchParams.gameCode || ""

  if (!sessionId || !gameCode) redirect("/")

  const games = await getGames()
  const game = games.find((g) => g.id === gameCode)
  if (!game) redirect("/")

  const bgPath = game.assets?.background || ""
  const bgUrl = bgPath ? `/api/assets?path=${encodeURIComponent(bgPath)}` : ""

  const launchUrl = searchParams.launchUrl || ""
  const symbols = normalizeSymbols(game.assets?.symbols)

  return (
    <PlayClient
      sessionId={sessionId}
      gameName={game.name}
      kind={game.kind}
      backgroundUrl={bgUrl}
      launchUrl={launchUrl}
      symbols={symbols}
    />
  )
}
