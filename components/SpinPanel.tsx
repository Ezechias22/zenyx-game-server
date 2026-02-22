'use client'

import { useMemo, useState } from 'react'

export default function SpinPanel({
  balance,
  win,
  bet,
  setBet,
  onSpin,
  spinning,
  onSound,
  fsLocked
}: {
  balance: number
  win: number
  bet: number
  setBet: (v: number) => void
  onSpin: () => void
  spinning: boolean
  onSound?: (name: 'spin' | 'stop' | 'win' | 'click') => void
  fsLocked?: boolean
}) {
  const balText = useMemo(() => (Number.isFinite(balance) ? balance : 0).toFixed(2), [balance])
  const winText = useMemo(() => (Number.isFinite(win) ? win : 0).toFixed(2), [win])

  const [press, setPress] = useState(false)

  function dec() {
    if (fsLocked) return
    onSound?.('click')
    setBet(Math.max(0.00000001, Math.round((bet - 0.1) * 100) / 100))
  }
  function inc() {
    if (fsLocked) return
    onSound?.('click')
    setBet(Math.min(999999999, Math.round((bet + 0.1) * 100) / 100))
  }

  function spin() {
    if (spinning) return
    onSound?.('spin')
    setPress(true)
    window.setTimeout(() => setPress(false), 220)
    onSpin()
  }

  return (
    <div
      className="w-full"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/7 p-3 backdrop-blur">
            <div className="text-[11px] text-white/55">Balance</div>
            <div className="mt-1 text-sm font-extrabold text-white">{balText}</div>
          </div>

          <div
            className={`rounded-2xl border bg-white/7 p-3 backdrop-blur transition-all duration-200 ${
              win > 0 ? 'border-emerald-400/30 shadow-[0_0_22px_rgba(52,211,153,0.20)]' : 'border-white/10'
            }`}
          >
            <div className="text-[11px] text-white/55">Win</div>
            <div className="mt-1 text-sm font-extrabold text-white">{winText}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/7 p-3 backdrop-blur">
            <div className="text-[11px] text-white/55">Bet</div>

            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={dec}
                disabled={spinning || !!fsLocked}
                className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/85 hover:bg-white/10 disabled:opacity-50"
              >
                –
              </button>

              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={Number.isFinite(bet) ? bet : 0}
                disabled={spinning || !!fsLocked}
                onChange={(e) => {
                  if (fsLocked) return
                  const v = Number(e.target.value)
                  setBet(Number.isFinite(v) ? v : 0)
                }}
                className="h-9 w-full min-w-[92px] rounded-xl border border-white/10 bg-black/25 px-3 text-center text-sm font-extrabold text-white outline-none focus:border-white/25 disabled:opacity-60"
              />

              <button
                onClick={inc}
                disabled={spinning || !!fsLocked}
                className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/85 hover:bg-white/10 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* SPIN (round + animated) */}
        <div className="flex w-full justify-center md:w-auto md:justify-end">
          <button
            onClick={spin}
            disabled={spinning}
            className={[
              'h-16 w-16 md:h-[70px] md:w-[70px] rounded-full',
              'font-black text-white',
              'border border-white/15',
              'shadow-[0_14px_40px_rgba(0,0,0,0.55)]',
              'transition-all duration-150',
              spinning ? 'opacity-70' : 'hover:scale-[1.05] active:scale-[0.98]',
              press ? 'animate-[spinPress_220ms_ease-out_forwards]' : ''
            ].join(' ')}
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(34,211,238,1), rgba(139,92,246,1) 55%, rgba(17,24,39,1) 120%)'
            }}
          >
            {spinning ? '…' : 'SPIN'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spinPress {
          0% { box-shadow: 0 0 0 rgba(34,211,238,0.0); transform: scale(1); }
          45% { box-shadow: 0 0 32px rgba(34,211,238,0.35); transform: scale(1.06); }
          100% { box-shadow: 0 0 0 rgba(34,211,238,0.0); transform: scale(1); }
        }
      `}</style>
    </div>
  )
}