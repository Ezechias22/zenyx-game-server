export const runtime = "nodejs"

export async function GET(req: Request) {
  const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL!
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path")

  if (!path || !path.startsWith("/assets/")) {
    return new Response("Invalid path", { status: 400 })
  }

  const upstream = await fetch(`${PROVIDER_BASE_URL}${path}`, {
    cache: "force-cache",
  })

  if (!upstream.ok) {
    return new Response("Not found", { status: 404 })
  }

  const buffer = await upstream.arrayBuffer()
  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream"

  return new Response(buffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
    },
  })
}
