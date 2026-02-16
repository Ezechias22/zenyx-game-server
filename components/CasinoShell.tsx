import type { ReactNode } from 'react'
import Link from 'next/link'

export default function CasinoShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3 no-tap-highlight">
            <div className="h-9 w-9 rounded-xl bg-[radial-gradient(circle_at_30%_30%,rgba(0,240,255,0.9),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(160,120,255,0.9),transparent_60%),linear-gradient(135deg,#0a0b12,#05060a)] shadow-[0_0_30px_rgba(100,120,255,0.18)]" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">ZENYX</div>
              <div className="text-[11px] text-white/60">Game Server • Provider Live</div>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-xs text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Ultra Casino UI
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        Zenyx Game Server • Production Ready
      </footer>
    </div>
  )
}
