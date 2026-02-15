import { redirect } from "next/navigation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function PlayPage({
  searchParams
}: {
  searchParams: { sessionId?: string; gameCode?: string }
}) {
  const sessionId =
    typeof searchParams.sessionId === "string" && searchParams.sessionId.length >= 10
      ? searchParams.sessionId
      : ""

  if (!sessionId) redirect("/")

  // ✅ IMPORTANT: /play doit afficher uniquement le provider launch (vrai jeu)
  // Le provider rend l'UI complète via /v1/launch?s=...
  return (
    <iframe
      title="ZENYX Game"
      src={`https://zenyx-games-provider-production.up.railway.app/v1/launch?s=${encodeURIComponent(
        sessionId
      )}`}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
        background: "#000"
      }}
      allow="autoplay; fullscreen; clipboard-read; clipboard-write"
      referrerPolicy="no-referrer"
    />
  )
}
