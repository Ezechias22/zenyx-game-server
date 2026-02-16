import '../globals.css'
import type { ReactNode } from 'react'
import CasinoShell from '@/components/CasinoShell'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(120,90,255,0.35),transparent),radial-gradient(900px_500px_at_20%_10%,rgba(0,220,255,0.18),transparent),linear-gradient(180deg,#05060a,#05060a_30%,#02030a)] text-white">
      <CasinoShell>{children}</CasinoShell>
    </div>
  )
}
