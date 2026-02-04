// app/api/games/route.ts
import { NextResponse } from "next/server";
import { providerGetGames } from "@/src/lib/provider";

export async function GET() {
  try {
    const games = await providerGetGames();
    return NextResponse.json(games);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
