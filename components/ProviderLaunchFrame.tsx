'use client'

export default function ProviderLaunchFrame({
  launchUrl,
  onClose
}: {
  launchUrl: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-[min(1200px,96vw)] flex-col p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-sm font-semibold text-white/90">Provider Launch (Live)</div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <iframe
            src={launchUrl}
            title="Zenyx Provider Launch"
            className="absolute inset-0 h-full w-full"
            // sandbox: on autorise uniquement le strict nécessaire.
            // Si le provider a besoin de plus (ex: popups), on ajustera.
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="no-referrer"
            loading="eager"
            allow="fullscreen"
          />
        </div>

        <div className="mt-3 text-[11px] text-white/50">
          Iframe sandbox enabled • same sessionId • provider live
        </div>
      </div>
    </div>
  )
}
