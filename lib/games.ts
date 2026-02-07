export type GameCode='fruit_classic'|'egypt_riches'|'jungle_wild'|'luxury_gold'|'diamond_rush'|'fire_reels'|'mystic_fortune'
export const GAMES:Record<GameCode,{name:string;theme:string}>={
  fruit_classic:{name:'Fruit Classic',theme:'fruit'},
  egypt_riches:{name:'Egypt Riches',theme:'egypt'},
  jungle_wild:{name:'Jungle Wild',theme:'jungle'},
  luxury_gold:{name:'Luxury Gold',theme:'luxury'},
  diamond_rush:{name:'Diamond Rush',theme:'diamond'},
  fire_reels:{name:'Fire Reels',theme:'fire'},
  mystic_fortune:{name:'Mystic Fortune',theme:'mystic'},
}
export const DEFAULT_PAYLINES:number[][]=[
  [0,0,0,0,0],
  [1,1,1,1,1],
  [2,2,2,2,2],
  [0,1,2,1,0],
  [2,1,0,1,2],
  [0,0,1,0,0],
  [2,2,1,2,2],
  [1,0,0,0,1],
  [1,2,2,2,1],
  [0,1,1,1,0],
  [2,1,1,1,2],
  [0,1,2,2,2],
]
