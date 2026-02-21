'use client'

import { useMemo } from 'react'

export default function JackpotDisplay({
  meter,
  lastWin
}: {
  meter: number
  lastWin: number
}) {
  const meterText = useMemo(() => meter.toFixed(2), [meter])
  const winText = useMemo(() => lastWin.toFixed(2), [lastWin])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold text-white/55">JACKPOT</div>
          <div className="text-sm font-black tracking-wide text-amber-200">
            {meterText}
          </div>
        </div>

        {lastWin > 0 ? (
          <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-2 py-1 text-[11px] font-extrabold text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.25)]">
            +{winText}
          </div>
        ) : (
          <div className="text-[11px] text-white/45">LIVE</div>
        )}
      </div>
    </div>
  )
}