'use client'

import { useMemo } from 'react'

export default function SpinPanel({
  balance,
  win,
  bet,
  setBet,
  onSpin,
  spinning,
  onSound
}: {
  balance: number
  win: number
  bet: number
  setBet: (v: number) => void
  onSpin: () => void
  spinning: boolean
  onSound?: (name: 'spin' | 'stop' | 'win' | 'click') => void
}) {
  const balText = useMemo(() => balance.toFixed(2), [balance])
  const winText = useMemo(() => win.toFixed(2), [win])

  function dec() {
    onSound?.('click')
    setBet(Math.max(0.1, Math.round((bet - 0.1) * 100) / 100))
  }
  function inc() {
    onSound?.('click')
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
        {/* ✅ Mobile: stack. Desktop: row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                  disabled={spinning}
                  className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  –
                </button>
                <div className="min-w-[56px] text-center text-sm font-extrabold">{bet.toFixed(2)}</div>
                <button
                  onClick={inc}
                  disabled={spinning}
                  className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* ✅ Button always visible on mobile */}
          <button
            onClick={spin}
            disabled={spinning}
            className={`h-12 w-full md:w-[min(46vw,360px)] rounded-2xl font-extrabold tracking-wide transition-all duration-200 ${
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
  )
}
