export type Game = { id: string; kind: string; rtp: number };

export type SessionResponse = {
  sessionId: string;
  launchUrl?: string;
  ttlSec?: number;
  init?: any;
};

export type PlayResult = {
  provider: string;
  roundId: string;
  gameCode: string;
  bet: string;
  win: string;
  currency: string;
  result: {
    type: string;
    symbols: string[];
    multiplier: number;
    bet: number;
    win: number;
    rtp?: number;
    volatility?: string;
  };
  nonce: number;
  balance: {
    playerExternalId: string;
    currency: string;
    balance: string | number;
  };
};
