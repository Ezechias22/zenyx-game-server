type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const cur = store.get(key)

  if (!cur || now > cur.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (cur.count >= limit) return { ok: false, remaining: 0, resetAt: cur.resetAt }

  cur.count += 1
  store.set(key, cur)
  return { ok: true, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt }
}
