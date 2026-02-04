import { NextResponse } from "next/server";
import { providerPlay } from "@/src/lib/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body?.sessionId || "");
    const bet = Number(body?.bet);

    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    if (!Number.isFinite(bet) || bet <= 0) return NextResponse.json({ error: "Invalid bet" }, { status: 400 });

    const data = await providerPlay({
      sessionId,
      bet,
      clientSeed: body?.clientSeed ? String(body.clientSeed) : undefined,
      idempotencyKey: body?.idempotencyKey ? String(body.idempotencyKey) : undefined
    });

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
