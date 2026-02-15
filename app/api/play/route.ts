import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  sessionId: z.string().min(10),
  bet: z.coerce.number().positive().default(1),
});

function getProviderEnv() {
  const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL;
  const PUBLIC_TOKEN = process.env.PUBLIC_TOKEN;
  const OPERATOR_KEY = process.env.OPERATOR_KEY;

  if (!PROVIDER_BASE_URL || !PUBLIC_TOKEN || !OPERATOR_KEY) {
    return { ok: false as const, error: "Missing env vars" };
  }

  return {
    ok: true as const,
    PROVIDER_BASE_URL,
    PUBLIC_TOKEN,
    OPERATOR_KEY,
  };
}

export async function POST(req: Request) {
  const env = getProviderEnv();
  if (!env.ok) {
    return NextResponse.json({ error: env.error }, { status: 500 });
  }

  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { sessionId, bet } = parsed.data;

  const url = new URL("/v1/public/play", env.PROVIDER_BASE_URL);

  const r = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-public-token": env.PUBLIC_TOKEN,
      "x-operator-key": env.OPERATOR_KEY,
    },
    body: JSON.stringify({ sessionId, bet }),
    cache: "no-store",
  });

  const text = await r.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!r.ok) {
    return NextResponse.json(
      { error: true, status: r.status, body: data },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
