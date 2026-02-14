export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { getEnvSafe } from "@/lib/runtime-env"

export async function GET(req: Request) {
  const env = getEnvSafe()
  const { missing } = env

  if (missing.includes("PROVIDER_BASE_URL")) {
    return Response.json({ error: "Missing PROVIDER_BASE_URL" }, { status: 500 })
  }

  // ici TypeScript est sûr que c'est défini
  const PROVIDER_BASE_URL = env.PROVIDER_BASE_URL!

  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path")

  if (!path || !path.startsWith("/assets/")) {
    return Response.json({ error: "Invalid asset path" }, { status: 400 })
  }

  const base = PROVIDER_BASE_URL.replace(/\/+$/, "")
  const upstreamUrl = `${base}${path}`

  const upstream = await fetch(upstreamUrl, { cache: "no-store" })

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "")
    return new Response(text || "Upstream error", { status: upstream.status })
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream"

  const body = await upstream.arrayBuffer()

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=600"
    }
  })
}
