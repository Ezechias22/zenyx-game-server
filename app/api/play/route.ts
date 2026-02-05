import { NextResponse } from "next/server";
import { providerPublicPlay } from "@/src/lib/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await providerPublicPlay(body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "play error" }, { status: 500 });
  }
}
