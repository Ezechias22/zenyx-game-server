'use client'

import { useMemo } from 'react'

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

export default function SpinPanel({
  balance,
  win,
  bet,
  setBet,
  onSpin,
  spinning
}: {
  balance: number
  win: number
  bet: number
  setBet: (v: number) => void
  onSpin: () => void
  spinning: boolean
}) {
  const canSpin = useMemo(() => !spinning && bet > 0, [spinning, bet])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] text-white/60">Balance</div>
            <div className="text-sm font-semibold">{formatMoney(balance)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] text-white/60">Win</div>
            <div className="text-sm font-semibold">{formatMoney(win)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] text-white/60">Bet</div>
            <div className="flex items-center justify-between gap-2">
              <button
                className="h-8 w-8 rounded-xl border border-white/10 bg-black/30 text-sm font-bold disabled:opacity-40"
                onClick={() => setBet(Math.max(0.1, +(bet - 0.1).toFixed(2)))}
                disabled={spinning}
                type="button"
              >
                −
              </button>
              <div className="min-w-[60px] text-center text-sm font-semibold">{formatMoney(bet)}</div>
              <button
                className="h-8 w-8 rounded-xl border border-white/10 bg-black/30 text-sm font-bold disabled:opacity-40"
                onClick={() => setBet(+(bet + 0.1).toFixed(2))}
                disabled={spinning}
                type="button"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end">
          <button
            onClick={onSpin}
            disabled={!canSpin}
            type="button"
            className="no-tap-highlight w-full max-w-[320px] rounded-2xl bg-[linear-gradient(135deg,rgba(0,240,255,0.9),rgba(160,120,255,0.9))] px-8 py-4 text-sm font-extrabold tracking-wide text-black shadow-[0_0_40px_rgba(80,120,255,0.25)] disabled:opacity-50 sm:w-[260px]"
          >
            {spinning ? 'SPINNING…' : 'SPIN'}
          </button>
        </div>
      </div>
    </div>
  )
}
