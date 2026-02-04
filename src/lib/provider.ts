// src/lib/provider.ts
import { z } from "zod";

const EnvSchema = z.object({
  PROVIDER_BASE_URL: z.string().url(),
  PUBLIC_TOKEN: z.string().min(5),
  OPERATOR_KEY: z.string().min(5)
});

function getEnv() {
  const parsed = EnvSchema.safeParse({
    PROVIDER_BASE_URL: process.env.PROVIDER_BASE_URL,
    PUBLIC_TOKEN: process.env.PUBLIC_TOKEN,
    OPERATOR_KEY: process.env.OPERATOR_KEY
  });

  if (!parsed.success) {
    // Affiche une erreur claire dans les logs Next
    console.error("❌ Missing/invalid env:", parsed.error.flatten().fieldErrors);
    throw new Error("Missing/invalid env (PROVIDER_BASE_URL/PUBLIC_TOKEN/OPERATOR_KEY)");
  }
  return parsed.data;
}

async function providerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const env = getEnv();
  const url = `${env.PROVIDER_BASE_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "x-public-token": env.PUBLIC_TOKEN,
      "x-operator-key": env.OPERATOR_KEY,
      "accept": "application/json",
      "content-type": "application/json"
    },
    cache: "no-store"
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === "object" && data?.message ? JSON.stringify(data.message) : text;
    throw new Error(`Provider error ${res.status}: ${msg}`);
  }

  return data as T;
}

export async function providerGetGames() {
  // /v1/provider/games est protégé par signature, donc ici on passe par l’endpoint public:
  // on va faire une liste locale côté game server si tu veux, MAIS on peut aussi appeler provider/games si tu exposes un endpoint public games.
  // => Dans notre flow actuel, la liste des jeux côté UI peut être "hardcodée" OU via provider/games si tu la rends publique.
  // Pour l’instant on utilise provider/games direct (si ça marche chez toi, ok).
  return providerFetch<any>("/v1/provider/games", { method: "GET" });
}

export async function providerCreateSession(payload: {
  gameCode: string;
  playerExternalId: string;
  currency: string;
  clientSeed?: string;
}) {
  return providerFetch<any>("/v1/public/session", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function providerPlay(payload: {
  sessionId: string;
  bet: number;
  clientSeed?: string;
  idempotencyKey?: string;
}) {
  return providerFetch<any>("/v1/public/play", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
