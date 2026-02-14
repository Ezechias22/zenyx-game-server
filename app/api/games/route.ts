export const runtime = "nodejs"

import { fetchGames } from "@/lib/provider"

export async function GET() {
  const games = await fetchGames()
  return Response.json(games)
}
