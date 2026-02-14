type AnyGame = Record<string, any>

function normalizeGames(payload: any): AnyGame[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.games)) return payload.games
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function getAssetUrl(providerBaseUrl: string, path?: string) {
  if (!path) return ""
  // path attendu: "/assets/egypt_riches/cover.png" etc.
  return `${providerBaseUrl}${path}`
}

export default async function Home() {
  const providerBaseUrl = process.env.PROVIDER_BASE_URL || ""

  // Appelle via notre API (headers côté serveur, jamais exposés)
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/games`, { cache: "no-store" })
  const payload = await res.json().catch(() => null)

  const games = normalizeGames(payload)

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>ZENYX Games Catalog</h1>
      <div style={{ opacity: 0.75, marginBottom: 20 }}>
        Games: <b>{games.length}</b>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {games.map((g: AnyGame) => {
          const code = g.gameCode || g.code || g.id
          const name = g.name || g.title || code
          const kind = g.kind || g.type || "-"
          const rtp = g.rtp ?? g.math?.rtp ?? "-"
          const cover = getAssetUrl(providerBaseUrl, g.assets?.cover || g.cover)
          const bg = getAssetUrl(providerBaseUrl, g.assets?.background || g.background)

          return (
            <div key={String(code)} style={{ background: "#111827", borderRadius: 14, overflow: "hidden" }}>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={name} style={{ width: "100%", height: 160, objectFit: "cover" }} />
              ) : (
                <div style={{ height: 160, background: "#0b1220" }} />
              )}

              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{name}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                  <div>code: <b>{String(code)}</b></div>
                  <div>kind: <b>{String(kind)}</b></div>
                  <div>rtp: <b>{String(rtp)}</b></div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={`/play?gameCode=${encodeURIComponent(String(code))}`}
                    style={{
                      padding: "8px 12px",
                      background: "#7c3aed",
                      borderRadius: 10,
                      color: "white",
                      textDecoration: "none",
                      fontWeight: 600
                    }}
                  >
                    Play
                  </a>

                  {bg ? (
                    <a
                      href={bg}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 12px",
                        background: "#0b1220",
                        borderRadius: 10,
                        color: "white",
                        textDecoration: "none",
                        opacity: 0.9
                      }}
                    >
                      Background
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
