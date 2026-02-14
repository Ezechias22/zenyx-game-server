import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")

  if (!path) {
    return new Response("Missing path", { status: 400 })
  }

  const providerBase = process.env.PROVIDER_BASE_URL!

  const fullUrl = `${providerBase}${path}`

  const res = await fetch(fullUrl)

  if (!res.ok) {
    return new Response("Asset error", { status: 500 })
  }

  const buffer = await res.arrayBuffer()

  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/png",
      "Cache-Control": "public, max-age=86400"
    }
  })
}
