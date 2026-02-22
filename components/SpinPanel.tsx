'use client'

import { useMemo, useState } from 'react'

export default function SpinPanel({
  balance,
  win,
  bet,
  setBet,
  onSpin,
  spinning,
  fsLocked,
  autoOn,
  turboOn,
  onToggleAuto,
  onToggleTurbo
}: {
  balance: number
  win: number
  bet: number
  setBet: (v: number) => void
  onSpin: () => void
  spinning: boolean
  fsLocked?: boolean
  autoOn: boolean
  turboOn: boolean
  onToggleAuto: () => void
  onToggleTurbo: () => void
}) {
  const balText = useMemo(() => (Number.isFinite(balance) ? balance : 0).toFixed(2), [balance])
  const winText = useMemo(() => (Number.isFinite(win) ? win : 0).toFixed(2), [win])

  const [betInput, setBetInput] = useState(() => String((Number.isFinite(bet) ? bet : 1).toFixed(2)))

  useMemo(() => {
    const v = (Number.isFinite(bet) ? bet : 1).toFixed(2)
    if (betInput !== v) setBetInput(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bet])

  function clampBet(n: number) {
    const x = Number.isFinite(n) ? n : 1
    return Math.max(0.01, Math.min(999999, Math.round(x * 100) / 100))
  }

  function applyInput(v: string) {
    setBetInput(v)
    const n = Number.parseFloat(v.replace(',', '.'))
    if (Number.isFinite(n)) setBet(clampBet(n))
  }

  function dec() {
    if (spinning || fsLocked) return
    setBet(clampBet((Number(bet) || 1) - 0.1))
  }

  function inc() {
    if (spinning || fsLocked) return
    setBet(clampBet((Number(bet) || 1) + 0.1))
  }

  function spin() {
    if (spinning) return
    onSpin()
  }

  const turboActive = turboOn
  const autoActive = autoOn

  return (
    <div className="w-full rounded-3xl border border-white/12 bg-black/55 p-3 backdrop-blur-md shadow-[0_16px_60px_rgba(0,0,0,0.45)]">
      {/* top strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <div className="text-[10px] font-semibold text-white/55">Balance</div>
          <div className="mt-1 text-sm font-extrabold text-white">{balText}</div>
        </div>

        <div
          className={[
            'rounded-2xl border bg-white/5 p-2.5 transition-all duration-200',
            win > 0 ? 'border-emerald-400/30 shadow-[0_0_18px_rgba(52,211,153,0.18)]' : 'border-white/10'
          ].join(' ')}
        >
          <div className="text-[10px] font-semibold text-white/55">Win</div>
          <div className="mt-1 text-sm font-extrabold text-white">{winText}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <div className="text-[10px] font-semibold text-white/55">Bet</div>

          <div className="mt-1.5 flex items-center gap-2">
            <button
              onClick={dec}
              disabled={spinning || !!fsLocked}
              className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/85 disabled:opacity-50"
            >
              –
            </button>

            <input
              value={betInput}
              onChange={(e) => applyInput(e.target.value)}
              disabled={spinning || !!fsLocked}
              inputMode="decimal"
              className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-2 text-center text-sm font-extrabold text-white outline-none disabled:opacity-50"
            />

            <button
              onClick={inc}
              disabled={spinning || !!fsLocked}
              className="h-9 w-9 rounded-xl border border-white/10 bg-black/30 text-white/85 disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* controls row like casino */}
      <div className="mt-3 flex items-center justify-between gap-3">
        {/* TURBO */}
        <button
          onClick={onToggleTurbo}
          className={[
            'h-12 w-[86px] rounded-2xl border text-xs font-black tracking-wide',
            turboActive
              ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.25)]'
              : 'border-white/12 bg-white/5 text-white/80'
          ].join(' ')}
        >
          TURBO
        </button>

        {/* SPIN round center */}
        <button
          onClick={spin}
          disabled={spinning}
          className={[
            'relative h-[84px] w-[84px] rounded-full font-black text-white',
            'transition-all duration-200',
            spinning ? 'opacity-70' : 'active:scale-[0.98]'
          ].join(' ')}
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(250,204,21,1) 0%, rgba(168,85,247,1) 55%, rgba(17,24,39,1) 100%)'
          }}
        >
          <span
            className={[
              'absolute inset-[-10px] rounded-full border',
              spinning
                ? 'border-white/25 animate-[spinPulse_0.75s_ease-in-out_infinite]'
                : 'border-white/15 animate-[idlePulse_1.5s_ease-in-out_infinite]'
            ].join(' ')}
          />
          <span className="relative text-sm">{spinning ? '…' : 'SPIN'}</span>
        </button>

        {/* AUTO */}
        <button
          onClick={onToggleAuto}
          disabled={!!fsLocked} // free spins already auto-run
          className={[
            'h-12 w-[86px] rounded-2xl border text-xs font-black tracking-wide disabled:opacity-50',
            autoActive
              ? 'border-amber-300/40 bg-amber-400/15 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.22)]'
              : 'border-white/12 bg-white/5 text-white/80'
          ].join(' ')}
        >
          AUTO
        </button>
      </div>

      <style jsx global>{`
        @keyframes idlePulse {
          0% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.06); opacity: 0.45; }
          100% { transform: scale(1); opacity: 0.25; }
        }
        @keyframes spinPulse {
          0% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.12); opacity: 0.60; }
          100% { transform: scale(1); opacity: 0.25; }
        }
      `}</style>
    </div>
  )
}