export const runtime = "nodejs"

export async function GET() {
  const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL!
  const PUBLIC_TOKEN = process.env.PUBLIC_TOKEN!
  const OPERATOR_KEY = process.env.OPERATOR_KEY!

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/games`, {
    cache: "no-store",
    headers: {
      "x-public-token": PUBLIC_TOKEN,
      "x-operator-key": OPERATOR_KEY,
    },
  })

  const json = await res.json().catch(() => ({}))
  return Response.json(json, { status: res.status })
}
