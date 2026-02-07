import { z } from 'zod'

export const GameCode = z.enum([
  'fruit_classic',
  'egypt_riches',
  'jungle_wild',
  'luxury_gold',
  'diamond_rush',
  'fire_reels',
  'mystic_fortune',
])

export const SessionRequest = z.object({
  gameCode: GameCode,
  playerExternalId: z.string().min(1).max(64),
  currency: z.string().min(1).max(8),
})

export const SessionResponse = z.object({
  sessionId: z.string().min(1),
  launchUrl: z.string().url(),
})

export const PlayRequest = z.object({
  sessionId: z.string().min(1),
  bet: z.number().positive().finite(),
})

export const SlotMatrix = z.array(z.array(z.string().min(1))).min(1)

export const PlayResponse = z.object({
  result: z.object({
    type: z.literal('SLOT'),
    balance: z.number().finite().optional(),
    win: z.number().finite().optional(),
    currency: z.string().optional(),
    symbols: SlotMatrix.optional(),
    reels: SlotMatrix.optional(),
    paylines: z.array(z.array(z.number().int().nonnegative())).optional(),
    winningLines: z.array(z.object({
      lineIndex: z.number().int().nonnegative(),
      positions: z.array(z.tuple([
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
      ])),
      amount: z.number().finite().optional(),
    })).optional(),
  }),
})

export const GamesResponse = z.object({
  games: z.array(z.object({
    code: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
  })),
})
