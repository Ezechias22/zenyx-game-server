export type SymbolKey =
  | "tiger"
  | "coin"
  | "lantern"
  | "drum"
  | "ingot"
  | "jade"
  | "wild";

export const EMOJI_TO_SYMBOL: Record<string, SymbolKey> = {
  "🍒": "coin",
  "7": "wild",
  "🍋": "lantern",
  "🍊": "jade",
  "🔔": "drum",
  "💎": "ingot",
};

export const SYMBOL_ASSETS: Record<SymbolKey, string> = {
  tiger: "/symbols/tiger.png",
  coin: "/symbols/coin.png",
  lantern: "/symbols/lantern.png",
  drum: "/symbols/drum.png",
  ingot: "/symbols/ingot.png",
  jade: "/symbols/jade.png",
  wild: "/symbols/wildcard.png",
};

export function mapBackendSymbolToAsset(symbolFromApi: string): string {
  const key = EMOJI_TO_SYMBOL[symbolFromApi] ?? "wild";
  return SYMBOL_ASSETS[key];
}
