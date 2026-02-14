import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") || ""

  if (!path.startsWith("/assets/")) {
    return new Response("Invalid path", { status: 400 })
  }

  const base = (process.env.PROVIDER_BASE_URL || "").replace(/\/+$/, "")
  const upstreamUrl = `${base}${path}`

  const upstream = await fetch(upstreamUrl, { cache: "no-store" })
  if (!upstream.ok) {
    return new Response("Asset error", { status: upstream.status })
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream"
  const buf = await upstream.arrayBuffer()

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400"
    }
  })
}
