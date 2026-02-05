import { NextResponse } from "next/server";
import { providerCreateSession } from "@/src/lib/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await providerCreateSession(body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "session error" }, { status: 500 });
  }
}
