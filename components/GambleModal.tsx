'use client'

export default function GambleModal({
  open,
  stake,
  payout,
  win,
  onClose
}: {
  open: boolean
  stake: number
  payout: number
  win: boolean | null
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[520px] rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/60 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="text-center">
          <div className="text-[clamp(18px,4vw,30px)] font-black text-white">
            GAMBLE
          </div>

          <div className="mt-2 text-sm text-white/70">
            Stake: <span className="font-extrabold text-white">{stake.toFixed(2)}</span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            {win === null ? (
              <div className="text-sm font-extrabold text-white/80">RESOLVING…</div>
            ) : win ? (
              <div className="text-sm font-black text-emerald-200">
                WIN • PAYOUT {payout.toFixed(2)}
              </div>
            ) : (
              <div className="text-sm font-black text-red-200">
                LOSE • PAYOUT {payout.toFixed(2)}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 hover:bg-white/10"
          >
            CLOSE
          </button>

          <div className="mt-3 text-xs text-white/45">
            Provider authoritative • UI display only
          </div>
        </div>
      </div>
    </div>
  )
}