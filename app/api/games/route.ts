export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { fetchGames } from "@/lib/provider"

export async function GET() {
  try {
    const data = await fetchGames()

    // Si provider renvoie une erreur
    if ((data as any)?.error) {
      return Response.json(
        (data as any).body ?? { error: "Provider error" },
        { status: (data as any).status || 502 }
      )
    }

    return Response.json(data)
  } catch (err: any) {
    return Response.json(
      { error: "Internal error", message: err?.message },
      { status: 500 }
    )
  }
}
