import { redirect } from "next/navigation"
import PlayClient from "./play-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string; gameCode?: string }
}) {
  const sessionId =
    typeof searchParams.sessionId === "string" && searchParams.sessionId.length >= 10
      ? searchParams.sessionId
      : ""

  if (!sessionId) redirect("/")

  const gameCode = typeof searchParams.gameCode === "string" ? searchParams.gameCode : ""

  return <PlayClient sessionId={sessionId} initialGameCode={gameCode} />
}
