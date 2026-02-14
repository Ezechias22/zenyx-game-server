import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function mustEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path") || ""
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`

  // ✅ security: only allow provider assets paths
  if (!path.startsWith("/assets/")) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 })
  }

  const base = mustEnv("PROVIDER_BASE_URL").replace(/\/+$/, "")
  const url = `${base}${path}`

  const upstream = await fetch(url, { cache: "no-store" })
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Asset fetch failed", status: upstream.status },
      { status: upstream.status }
    )
  }

  const buf = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get("content-type") || "application/octet-stream"

  const res = new NextResponse(buf, { status: 200 })
  res.headers.set("Content-Type", contentType)

  // ✅ cache ok for images (adjust if needed)
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable")

  // ✅ override CORP/CORS issues by serving from same-origin
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  return res
}
