import type { Game, SymbolAsset, PlayResult } from './types'

function asString(v: any): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function pick(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const s = asString(obj?.[k])
    if (s) return s
  }
  return null
}

function ensureAbsolute(base: string, path: string): string {
  const p = path.trim()
  if (!p) return ''
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  if (p.startsWith('/')) return `${base}${p}`
  return `${base}/${p}`
}

function normalizeSymbolsFromCatalog(base: string, rawGame: any): SymbolAsset[] {
  const arr = rawGame?.assets?.symbols ?? []
  if (!Array.isArray(arr)) return []

  const out: SymbolAsset[] = []
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (typeof v === 'string' && v.trim()) {
      out.push({ id: `sym_${i}`, src: ensureAbsolute(base, v) })
    }
  }

  const seen = new Set<string>()
  return out.filter(s => (seen.has(s.src) ? false : (seen.add(s.src), true)))
}

function parseDecimal(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * ✅ Provider catalog: id == gameId == gameCode
 */
export function normalizeGamesResponse(data: any, providerBaseUrl: string): Game[] {
  const list = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : []
  const base = providerBaseUrl.replace(/\/$/, '')

  const games: Game[] = []
  for (const g of list) {
    if (!g || typeof g !== 'object') continue

    const gameId = pick(g, ['id', 'gameCode', 'code', 'slug'])
    if (!gameId) continue

    const name = pick(g, ['name', 'title', 'label']) ?? gameId

    const coverPath = pick(g?.assets, ['cover']) ?? ''
    const cover = coverPath ? ensureAbsolute(base, coverPath) : ''

    const symbols = normalizeSymbolsFromCatalog(base, g)

    games.push({ id: gameId, name, cover, symbols })
  }

  return games
}

/**
 * ✅ Session: launch iframe: /v1/launch?s=<sessionId>
 * Note: some providers may return balance as object or number/string.
 */
export function normalizeSessionResponse(
  data: any,
  providerBaseUrl: string
): { sessionId: string; balance: number; launchUrl: string } {
  const sessionId = pick(data, ['sessionId']) ?? pick(data?.session, ['sessionId']) ?? ''
  if (!sessionId) throw new Error('Invalid session response: missing sessionId')

  // balance could be { balance:"2863.25", currency:"BRL", ... } OR number/string
  const balanceValue =
    data?.balance?.balance ?? data?.wallet?.balance ?? data?.balance ?? data?.session?.balance ?? 0

  const balance = parseDecimal(balanceValue)

  const base = providerBaseUrl.replace(/\/$/, '')
  const launchUrl = `${base}/v1/launch?s=${encodeURIComponent(sessionId)}`

  return { sessionId, balance, launchUrl }
}

/**
 * ✅ SLOT stable:
 * - data.result.grid = 3x5 symbol KEYS
 * - balance object at data.balance.balance (string decimal)
 * - win often at data.win or data.result.win (string/number)
 */
export function normalizePlayResponse(
  data: any,
  opts: { gameId: string; providerBaseUrl: string }
): PlayResult {
  const { gameId, providerBaseUrl } = opts

  const result = data?.result
  if (!result || !Array.isArray(result.grid) || !Array.isArray(result.grid[0])) {
    throw new Error('Invalid play response: missing result.grid')
  }

  const rawGrid = result.grid
  if (rawGrid.length !== 3 || rawGrid[0].length !== 5) {
    throw new Error('Invalid grid size (expected 3x5)')
  }

  const base = providerBaseUrl.replace(/\/$/, '')

  const grid: SymbolAsset[][] = rawGrid.map((row: any[], r: number) =>
    row.map((cell: any, c: number) => {
      const key = asString(cell)
      if (!key) throw new Error('Invalid symbol key')

      // hide internal placeholders (FR1_0_2 etc.)
      if (key.startsWith('FR')) return { id: `EMPTY_${r}_${c}`, src: '' }

      return {
        id: `${key}_${r}_${c}`,
        src: `${base}/assets/${gameId}/symbols/${encodeURIComponent(key)}.png`
      }
    })
  )

  // ✅ REAL balance object: data.balance.balance
  const balance = parseDecimal(data?.balance?.balance ?? data?.wallet?.balance ?? data?.balance ?? 0)

  // ✅ win can be string
  const win = parseDecimal(result?.win ?? data?.win ?? 0)

  return { grid, balance, win }
}
