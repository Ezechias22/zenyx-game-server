import { Suspense } from "react";
import PlayClient from "./PlayClient";

export const dynamic = "force-dynamic";

export default function PlayPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Chargement…</div>}>
      <PlayClient />
    </Suspense>
  );
}
