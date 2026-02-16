import { Suspense } from 'react'
import PlayClient from './PlayClient'

export const dynamic = 'force-dynamic'

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="pb-24">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Loading…
          </div>
        </div>
      }
    >
      <PlayClient />
    </Suspense>
  )
}
