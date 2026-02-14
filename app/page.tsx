async function getGames() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/games`, {
    cache: "no-store"
  })

  return res.json()
}

export default async function Home() {
  const games = await getGames()

  return (
    <main style={{ padding: 40 }}>
      <h1>ZENYX Games</h1>

      <div style={{ display: "grid", gap: 20 }}>
        {games?.map((game: any) => (
          <div
            key={game.gameCode}
            style={{
              padding: 20,
              background: "#1e293b",
              borderRadius: 10
            }}
          >
            <h3>{game.name}</h3>
            <p>Kind: {game.kind}</p>
            <p>RTP: {game.rtp}</p>

            <a
              href={`/play?gameCode=${game.gameCode}`}
              style={{
                padding: "8px 14px",
                background: "#7c3aed",
                borderRadius: 6,
                color: "white",
                textDecoration: "none"
              }}
            >
              Play
            </a>
          </div>
        ))}
      </div>
    </main>
  )
}
