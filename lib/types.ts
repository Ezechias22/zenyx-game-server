export type ProviderGameRaw = any
export type ProviderSessionRaw = any
export type ProviderPlayRaw = any

export type SymbolAsset = {
  id: string
  src: string
}

export type Game = {
  id: string
  name: string
  cover: string
  symbols: SymbolAsset[]
}

export type Session = {
  sessionId: string
  balance: number
  gameId?: string
}

export type PlayResult = {
  grid: SymbolAsset[][]
  balance: number
  win: number
}
