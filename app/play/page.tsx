import PlayClient from "./play-client";

export default function Page({ searchParams }: { searchParams: { sessionId?: string } }) {
  return <PlayClient sessionId={searchParams?.sessionId || ""} />;
}
