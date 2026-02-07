import { Suspense } from 'react'
import PlayClient from './play-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6 text-white/70">Chargement…</div>}>
      <PlayClient />
    </Suspense>
  )
}
