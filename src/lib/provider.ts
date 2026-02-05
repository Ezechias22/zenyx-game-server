type Json = any;

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env: ${name}`);
  return v;
}

function providerBaseUrl(): string {
  return mustEnv("PROVIDER_BASE_URL").replace(/\/+$/, "");
}

function publicHeaders(): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-public-token": mustEnv("PUBLIC_TOKEN"),
    "x-operator-key": mustEnv("OPERATOR_KEY"),
  };
}

async function parseRes(res: Response): Promise<Json> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function providerGetGames(): Promise<Json> {
  const url = `${providerBaseUrl()}/v1/provider/games`;
  const res = await fetch(url, {
    method: "GET",
    // games endpoint est signé normalement, mais ton game-server l’utilise en “liste”
    // Si tu veux strict, on peut ajouter un endpoint public “/public/games”.
    headers: publicHeaders(),
    cache: "no-store",
  });
  const data = await parseRes(res);
  if (!res.ok) throw new Error(data?.message || "providerGetGames failed");
  return data;
}

export async function providerCreateSession(body: any): Promise<Json> {
  const url = `${providerBaseUrl()}/v1/public/session`;
  const res = await fetch(url, {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const data = await parseRes(res);
  if (!res.ok) throw new Error(data?.message || "providerCreateSession failed");
  return data;
}

export async function providerPlay(body: any): Promise<Json> {
  const url = `${providerBaseUrl()}/v1/public/play`;
  const res = await fetch(url, {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const data = await parseRes(res);
  if (!res.ok) throw new Error(data?.message || "providerPlay failed");
  return data;
}
