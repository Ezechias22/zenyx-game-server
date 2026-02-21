'use client'

export default function BonusWheel({
  open,
  multiplier,
  onClose
}: {
  open: boolean
  multiplier: number | null
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[520px] rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/60 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="text-center">
          <div className="text-[clamp(18px,4vw,32px)] font-black tracking-tight text-white">
            BONUS WHEEL
          </div>

          <div className="mt-2 text-sm font-semibold text-white/70">
            {multiplier ? `RESULT: x${multiplier}` : 'SPINNING…'}
          </div>

          <div className="mt-5 flex justify-center">
            <div className="h-44 w-44 rounded-full border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(139,92,246,0.28)] animate-[wheelSpin_1.1s_linear_infinite]" />
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 hover:bg-white/10"
          >
            CLOSE
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}