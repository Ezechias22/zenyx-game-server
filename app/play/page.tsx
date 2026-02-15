import PlayClient from "./play-client";

export default function PlayPage({
  searchParams,
}: {
  searchParams?: { sessionId?: string; gameCode?: string };
}) {
  const sessionId = searchParams?.sessionId ?? "";
  const gameCode = searchParams?.gameCode ?? "";
  return <PlayClient sessionId={sessionId} gameCode={gameCode} />;
}
