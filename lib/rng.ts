import type { SymbolAsset } from './types'

export function randomGridFromSymbols(symbols: SymbolAsset[]): SymbolAsset[][] {
  if (!symbols.length) {
    throw new Error('No symbols available for initial grid')
  }

  // rows=3, cols=5
  const rows = 3
  const cols = 5
  const grid: SymbolAsset[][] = []

  for (let r = 0; r < rows; r++) {
    const row: SymbolAsset[] = []
    for (let c = 0; c < cols; c++) {
      const idx = Math.floor(Math.random() * symbols.length)
      row.push(symbols[idx])
    }
    grid.push(row)
  }
  return grid
}
