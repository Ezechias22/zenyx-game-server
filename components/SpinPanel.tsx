'use client'

import { useMemo } from 'react'

export default function SpinPanel({
  balance,
  win,
  bet,
  setBet,
  onSpin,
  spinning,
  onSound // optional for you
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

  const winGlow = win > 0

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
        <div className="flex gap-3">
          <div className="min-w-[160px] rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] text-white/50">Balance</div>
            <div className="mt-1 text-sm font-extrabold">{balText}</div>
          </div>

          <div
            className={`min-w-[140px] rounded-2xl border bg-white/5 p-3 transition-all duration-200 ${
              winGlow ? 'border-emerald-400/30 shadow-[0_0_22px_rgba(52,211,153,0.20)]' : 'border-white/10'
            }`}
          >
            <div className="text-[11px] text-white/50">Win</div>
            <div className="mt-1 text-sm font-extrabold">{winText}</div>
          </div>

          <div className="min-w-[170px] rounded-2xl border border-white/10 bg-white/5 p-3">
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

        <button
          onClick={spin}
          disabled={spinning}
          className={`h-12 w-[min(46vw,340px)] rounded-2xl font-extrabold tracking-wide transition-all duration-200 ${
            spinning
              ? 'cursor-not-allowed opacity-70'
              : 'hover:scale-[1.02] active:scale-[0.99]'
          }`}
          style={{
            background: 'linear-gradient(90deg, rgba(34,211,238,1) 0%, rgba(139,92,246,1) 100%)'
          }}
        >
          {spinning ? 'SPINNING…' : 'SPIN'}
        </button>
      </div>
    </div>
  )
}
