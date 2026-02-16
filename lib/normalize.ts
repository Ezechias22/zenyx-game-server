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

function parseDecimal(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
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

export function normalizeSessionResponse(
  data: any,
  providerBaseUrl: string
): { sessionId: string; balance: number; launchUrl: string } {
  const sessionId = pick(data, ['sessionId']) ?? pick(data?.session, ['sessionId']) ?? ''
  if (!sessionId) throw new Error('Invalid session response: missing sessionId')

  const balanceValue = data?.balance?.balance ?? data?.balance ?? data?.wallet?.balance ?? 0
  const balance = parseDecimal(balanceValue)

  const base = providerBaseUrl.replace(/\/$/, '')
  const launchUrl = `${base}/v1/launch?s=${encodeURIComponent(sessionId)}`
  return { sessionId, balance, launchUrl }
}

/**
 * Provider grid can be either:
 * - 3x5 (rows x cols)
 * - 5x3 (reels x rows)  => grid[reelIndex][rowIndex]
 *
 * We normalize to UI 3 rows x 5 cols.
 */
function gridTo3x5Keys(rawGrid: any): string[][] {
  if (!Array.isArray(rawGrid) || !Array.isArray(rawGrid[0])) throw new Error('Invalid grid')

  const rows = rawGrid.length
  const cols = rawGrid[0].length

  // already 3x5
  if (rows === 3 && cols === 5) {
    return rawGrid.map((r: any[]) => r.map((x: any) => asString(x) ?? ''))
  }

  // provider 5 reels x 3 rows
  if (rows === 5 && cols === 3) {
    const out: string[][] = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => ''))
    for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 3; row++) {
        out[row][reel] = asString(rawGrid[reel][row]) ?? ''
      }
    }
    return out
  }

  throw new Error(`Unsupported grid shape (${rows}x${cols})`)
}

export function normalizePlayResponse(
  data: any,
  opts: { gameId: string; providerBaseUrl: string }
): PlayResult {
  const { gameId, providerBaseUrl } = opts
  const result = data?.result
  if (!result) throw new Error('Invalid play response: missing result')

  const keys = gridTo3x5Keys(result.grid)
  const base = providerBaseUrl.replace(/\/$/, '')

  const grid: SymbolAsset[][] = keys.map((row, r) =>
    row.map((symbol, c) => {
      const key = (symbol ?? '').trim()
      // ALWAYS create a cell (no undefined)
      const id = key ? `${key}_${r}_${c}` : `EMPTY_${r}_${c}`
      const src = key ? `${base}/assets/${gameId}/symbols/${encodeURIComponent(key)}.png` : ''
      return { id, src }
    })
  )

  const balance = parseDecimal(data?.balance?.balance ?? data?.wallet?.balance ?? data?.balance ?? 0)
  const win = parseDecimal(result?.win ?? data?.win ?? 0)

  return { grid, balance, win }
}
