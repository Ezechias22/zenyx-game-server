import { redirect } from "next/navigation"
import PlayClient from "./play-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string; gameCode?: string }
}) {
  const sessionId =
    searchParams.sessionId && searchParams.sessionId.length >= 10 ? searchParams.sessionId : ""

  if (!sessionId) redirect("/")

  return <PlayClient sessionId={sessionId} initialGameCode={searchParams.gameCode || ""} />
}
