// src/lib/provider.ts
import type { Game } from "./types";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const PROVIDER_BASE_URL = mustEnv("PROVIDER_BASE_URL").replace(/\/+$/, "");
const PUBLIC_TOKEN = mustEnv("PUBLIC_TOKEN");
const OPERATOR_KEY = mustEnv("OPERATOR_KEY");

function providerHeaders() {
  return {
    "x-public-token": PUBLIC_TOKEN,
    "x-operator-key": OPERATOR_KEY,
    "content-type": "application/json",
  };
}

export async function providerGetGames(): Promise<Game[]> {
  const r = await fetch(`${PROVIDER_BASE_URL}/v1/public/games`, {
    method: "GET",
    // endpoint operator-signed (pas public) -> il faut API KEY + SIGNATURE normalement
    // MAIS ton provider expose /v1/public/games via OperatorAuthGuard (x-api-key + signature).
    // Pour éviter ça côté game-server, on passe par un endpoint PUBLIC côté provider:
    // => on doit ajouter un endpoint /v1/public/games côté provider (si pas déjà fait).
    //
    // Donc si tu n'as pas /v1/public/games, dis-moi et je te donne le patch provider.
    headers: providerHeaders(),
    cache: "no-store",
  });

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message || data?.error || "providerGetGames failed");
  return Array.isArray(data) ? data : [];
}

export async function providerCreateSession(input: {
  gameCode: string;
  playerExternalId: string;
  currency: string;
}) {
  const r = await fetch(`${PROVIDER_BASE_URL}/v1/public/session`, {
    method: "POST",
    headers: providerHeaders(),
    body: JSON.stringify(input),
  });

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message || data?.error || "providerCreateSession failed");
  return data;
}

export async function providerPublicPlay(input: {
  sessionId: string;
  bet: number;
  clientSeed?: string;
  idempotencyKey?: string;
}) {
  const r = await fetch(`${PROVIDER_BASE_URL}/v1/public/play`, {
    method: "POST",
    headers: providerHeaders(),
    body: JSON.stringify(input),
  });

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message || data?.error || "providerPublicPlay failed");
  return data;
}
