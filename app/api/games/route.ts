export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { fetchGames } from "@/lib/provider"

export async function GET() {
  const data = await fetchGames()
  // Si provider renvoie une erreur, on la forward proprement
  if (data?.error) {
    return Response.json(data.body ?? { error: "Provider error" }, { status: data.status || 502 })
  }
  return Response.json(data)
}
