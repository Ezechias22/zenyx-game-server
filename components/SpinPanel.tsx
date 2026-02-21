'use client'

import { useMemo } from 'react'

export default function SpinPanel({
  balance,
  win,
  bet,
  setBet,
  onSpin,
  spinning,
  onBuyFreeSpins,
  onOpenGamble,
  canGamble,
  fsLocked,
  onSound
}: {
  balance: number
  win: number
  bet: number
  setBet: (v: number) => void
  onSpin: () => void
  spinning: boolean
  onBuyFreeSpins: () => void
  onOpenGamble: () => void
  canGamble: boolean
  fsLocked: boolean
  onSound?: (name: 'spin' | 'stop' | 'win' | 'click') => void
}) {
  const balText = useMemo(() => balance.toFixed(2), [balance])
  const winText = useMemo(() => win.toFixed(2), [win])

  function dec() {
    onSound?.('click')
    if (fsLocked) return
    setBet(Math.max(0.1, Math.round((bet - 0.1) * 100) / 100))
  }
  function inc() {
    onSound?.('click')
    if (fsLocked) return
    setBet(Math.min(9999, Math.round((bet + 0.1) * 100) / 100))
  }
  function spin() {
    if (spinning) return
    onSound?.('spin')
    onSpin()
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur-xl"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-3 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left cards */}
          <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] text-white/50">Balance</div>
              <div className="mt-1 text-sm font-extrabold">{balText}</div>
            </div>

            <div
              className={`rounded-2xl border bg-white/5 p-3 transition-all duration-200 ${
                win > 0 ? 'border-emerald-400/30 shadow-[0_0_22px_rgba(52,211,153,0.20)]' : 'border-white/10'
              }`}
            >
              <div className="text-[11px] text-white/50">Win</div>
              <div className="mt-1 text-sm font-extrabold">{winText}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] text-white/50">Bet</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  onClick={dec}
                  disabled={spinning || fsLocked}
                  className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  –
                </button>

                <div className="min-w-[56px] text-center text-sm font-extrabold">{bet.toFixed(2)}</div>

                <button
                  onClick={inc}
                  disabled={spinning || fsLocked}
                  className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  +
                </button>
              </div>

              {fsLocked ? (
                <div className="mt-2 text-[10px] font-semibold text-amber-200/80">Bet locked (FREE SPINS)</div>
              ) : null}
            </div>
          </div>

          {/* Right controls */}
          <div className="w-full md:w-auto">
            {/* ✅ Mobile: SPIN full width */}
            <button
              onClick={spin}
              disabled={spinning}
              className={`h-12 w-full rounded-2xl font-extrabold tracking-wide transition-all duration-200 ${
                spinning ? 'cursor-not-allowed opacity-70' : 'hover:scale-[1.02] active:scale-[0.99]'
              }`}
              style={{
                background: 'linear-gradient(90deg, rgba(34,211,238,1) 0%, rgba(139,92,246,1) 100%)'
              }}
            >
              {spinning ? 'SPINNING…' : 'SPIN'}
            </button>

            {/* ✅ Mobile: two small buttons under SPIN */}
            <div className="mt-2 grid grid-cols-2 gap-2 md:hidden">
              <button
                onClick={onBuyFreeSpins}
                disabled={spinning || fsLocked}
                className="h-11 w-full rounded-2xl border border-amber-300/25 bg-amber-500/10 text-xs font-extrabold text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
              >
                BUY FREE SPINS
              </button>

              <button
                onClick={onOpenGamble}
                disabled={!canGamble}
                className="h-11 w-full rounded-2xl border border-emerald-300/25 bg-emerald-500/10 text-xs font-extrabold text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
              >
                GAMBLE
              </button>
            </div>

            {/* ✅ Desktop: inline buttons next to SPIN */}
            <div className="hidden md:flex md:items-center md:gap-3">
              <button
                onClick={onBuyFreeSpins}
                disabled={spinning || fsLocked}
                className="h-12 rounded-2xl border border-amber-300/25 bg-amber-500/10 px-5 text-xs font-extrabold text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
              >
                BUY FREE SPINS
              </button>

              <button
                onClick={onOpenGamble}
                disabled={!canGamble}
                className="h-12 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-5 text-xs font-extrabold text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
              >
                GAMBLE
              </button>

              <button
                onClick={spin}
                disabled={spinning}
                className={`h-12 rounded-2xl px-7 font-extrabold tracking-wide transition-all duration-200 ${
                  spinning ? 'cursor-not-allowed opacity-70' : 'hover:scale-[1.02] active:scale-[0.99]'
                }`}
                style={{
                  background: 'linear-gradient(90deg, rgba(34,211,238,1) 0%, rgba(139,92,246,1) 100%)'
                }}
              >
                {spinning ? 'SPINNING…' : 'SPIN'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}