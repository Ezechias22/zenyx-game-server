'use client'

import Lottie from 'lottie-react'
import { useMemo } from 'react'
import { useLottieJson } from './useLottieJson'

export default function FreeSpinsEndOverlay({
  open,
  gameId,
  totalWin,
  currency,
  onClose
}: {
  open: boolean
  gameId: string
  totalWin: number
  currency: string
  onClose: () => void
}) {
  const lottieUrl = useMemo(() => {
    if (!open) return null
    if (!gameId) return '/assets/common/lottie/fs_end.json'
    return `/assets/${gameId}/lottie/fs_end.json`
  }, [open, gameId])

  // try game lottie, if missing -> we will fallback manually
  const { data: gameAnim } = useLottieJson(lottieUrl)
  const { data: commonAnim } = useLottieJson(open ? '/assets/common/lottie/fs_end.json' : null)

  const anim = gameAnim ?? commonAnim

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b12] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.35),transparent_55%)]" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-white/90">FREE SPINS COMPLETE</div>
              <div className="mt-1 text-xs text-white/60">{gameId}</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
            >
              CLOSE
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] text-white/60">TOTAL WIN</div>
            <div className="mt-1 text-2xl font-black text-emerald-200">
              {currency} {totalWin.toFixed(2)}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-2">
            {anim ? (
              <Lottie animationData={anim} loop={false} />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm font-bold text-white/60">
                🎉 Bonus Complete
              </div>
            )}
          </div>

          <div className="mt-3 text-center text-xs font-semibold text-white/60">
            (Tu peux mettre ton son ici côté parent au moment où l’event arrive)
          </div>
        </div>
      </div>
    </div>
  )
}