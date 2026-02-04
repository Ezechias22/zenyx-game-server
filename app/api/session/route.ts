import { NextResponse } from "next/server";
import { providerCreateSession } from "@/src/lib/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const gameCode = String(body?.gameCode || "");
    const playerExternalId = String(body?.playerExternalId || "");
    const currency = String(body?.currency || "BRL");
    const clientSeed = body?.clientSeed ? String(body.clientSeed) : undefined;

    if (!gameCode || !playerExternalId) {
      return NextResponse.json({ error: "Missing gameCode/playerExternalId" }, { status: 400 });
    }

    const data = await providerCreateSession({ gameCode, playerExternalId, currency, clientSeed });
    const playUrl = `/play?sessionId=${encodeURIComponent(data.sessionId)}`;

    return NextResponse.json({ ...data, playUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
