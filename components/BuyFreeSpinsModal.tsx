'use client'

export default function BuyFreeSpinsModal({
  open,
  bet,
  currency,
  buyFsCostMul,
  freeSpinsCount,
  onCancel,
  onConfirm,
  busy
}: {
  open: boolean
  bet: number
  currency: string
  buyFsCostMul: number
  freeSpinsCount: number
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  if (!open) return null

  const cost = Math.max(0, bet * buyFsCostMul)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-[520px] rounded-3xl border border-white/10 bg-[#0b0b10] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.65)]">
        <div className="text-lg font-black">BUY FREE SPINS</div>
        <div className="mt-1 text-xs text-white/60">Confirmation d’achat</div>

        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Bet actuel</span>
            <span className="font-extrabold">
              {bet.toFixed(2)} {currency}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/70">Buy FS multiplier</span>
            <span className="font-extrabold">x{buyFsCostMul}</span>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex items-center justify-between">
            <span className="text-white/70">Coût</span>
            <span className="font-black text-amber-100">
              {cost.toFixed(2)} {currency}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/70">Tu achètes</span>
            <span className="font-extrabold text-emerald-100">{freeSpinsCount} Free Spins</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 text-sm font-extrabold text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="h-12 flex-1 rounded-2xl text-sm font-black tracking-wide disabled:opacity-60"
            style={{
              background: 'linear-gradient(90deg, rgba(245,158,11,1) 0%, rgba(139,92,246,1) 100%)'
            }}
          >
            {busy ? 'ACHAT…' : 'Confirmer l’achat'}
          </button>
        </div>

        <div className="mt-3 text-[11px] text-white/45">
          Le provider reste autoritaire : le coût final et l’état Free Spins viennent de la réponse.
        </div>
      </div>
    </div>
  )
}