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
  fsLocked,
  onBuyFreeSpins
}: {
  balance: number
  win: number
  bet: number
  setBet: (v: number) => void
  onSpin: () => void
  spinning: boolean
  onSound?: (name: 'spin' | 'stop' | 'win' | 'click') => void
  fsLocked?: boolean
  onBuyFreeSpins?: () => void
}) {
  const balText = useMemo(() => (Number.isFinite(balance) ? balance : 0).toFixed(2), [balance])
  const winText = useMemo(() => (Number.isFinite(win) ? win : 0).toFixed(2), [win])

  const [betText, setBetText] = useState(() => String(Number.isFinite(bet) ? bet : 1))

  function commitBet(raw: string) {
    const cleaned = raw.replace(',', '.')
    const n = Number.parseFloat(cleaned)
    if (!Number.isFinite(n)) return
    setBet(Math.max(0.01, Math.min(999999, n)))
  }

  function spin() {
    if (spinning) return
    onSound?.('spin')
    onSpin()
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur-xl"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="mx-auto w-full max-w-[1100px] px-2 py-2">
        {/* Compact row */}
        <div className="flex items-center gap-2">
          {/* Cards compact */}
          <div className="grid flex-1 grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[10px] leading-none text-white/50">Balance</div>
              <div className="mt-1 text-[13px] font-extrabold leading-none">{balText}</div>
            </div>

            <div
              className={`rounded-xl border bg-white/5 px-3 py-2 transition-all duration-200 ${
                win > 0 ? 'border-emerald-400/30 shadow-[0_0_18px_rgba(52,211,153,0.18)]' : 'border-white/10'
              }`}
            >
              <div className="text-[10px] leading-none text-white/50">Win</div>
              <div className="mt-1 text-[13px] font-extrabold leading-none">{winText}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[10px] leading-none text-white/50">Bet</div>
              <input
                value={betText}
                onChange={(e) => setBetText(e.target.value)}
                onBlur={() => commitBet(betText)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                disabled={spinning || !!fsLocked}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[13px] font-extrabold text-white outline-none focus:border-cyan-300/40 disabled:opacity-60"
                placeholder="1.00"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBuyFreeSpins}
              disabled={spinning || !!fsLocked || !onBuyFreeSpins}
              className="hidden h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-[12px] font-black text-white/85 hover:bg-white/10 disabled:opacity-50 md:block"
              title="Buy Free Spins"
            >
              BUY FS
            </button>

            {/* SPIN button round */}
            <button
              onClick={spin}
              disabled={spinning}
              className={[
                'h-12 w-12 rounded-full font-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)]',
                'transition-transform duration-150',
                spinning ? 'opacity-70' : 'active:scale-95 hover:scale-[1.03]',
                'animate-[spinPulse_1.1s_ease-in-out_infinite]'
              ].join(' ')}
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,1) 0%, rgba(139,92,246,1) 100%)'
              }}
            >
              {spinning ? '…' : '▶'}
            </button>
          </div>
        </div>

        <style jsx global>{`
          @keyframes spinPulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(34,211,238,0)); }
            50% { transform: scale(1.03); filter: drop-shadow(0 0 18px rgba(139,92,246,0.35)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(34,211,238,0)); }
          }
        `}</style>
      </div>
    </div>
  )
}