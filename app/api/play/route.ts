export const runtime = "nodejs"

export async function POST(req: Request) {
  const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL!
  const PUBLIC_TOKEN = process.env.PUBLIC_TOKEN!
  const OPERATOR_KEY = process.env.OPERATOR_KEY!

  const body = await req.json()

  const res = await fetch(`${PROVIDER_BASE_URL}/v1/public/play`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-public-token": PUBLIC_TOKEN,
      "x-operator-key": OPERATOR_KEY,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json().catch(() => ({}))
  return Response.json(json, { status: res.status })
}
