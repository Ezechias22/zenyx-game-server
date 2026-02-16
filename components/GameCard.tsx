import Link from 'next/link'
import type { Game } from '@/lib/types'

export default function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/play?gameId=${encodeURIComponent(game.id)}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/7"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-black/40">
        {/* img simple pour éviter les soucis de domains; object-fit contain demandé pour les assets */}
        <img
          src={game.cover}
          alt={game.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{game.name}</div>
            <div className="mt-1 text-xs text-white/60">{game.symbols.length} symbols</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold">
            PLAY
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-violet-400/10 blur-2xl" />
      </div>
    </Link>
  )
}
