import clsx from 'clsx'
export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost'|'danger' }) {
  const { className, variant='primary', ...rest } = props
  return (
    <button {...rest} className={clsx(
      'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed',
      variant==='primary' && 'bg-gradient-to-b from-yellow-300 to-yellow-600 text-black shadow-panel hover:brightness-105',
      variant==='ghost' && 'bg-white/5 text-white hover:bg-white/10',
      variant==='danger' && 'bg-gradient-to-b from-rose-400 to-rose-600 text-white hover:brightness-105',
      className
    )}/>
  )
}
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={clsx('rounded-2xl bg-black/40 border border-white/10 shadow-panel', className)} />
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return <input {...rest} className={clsx('w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/15', className)} />
}
export function Label({ className, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={clsx('text-xs text-white/70', className)} />
}
