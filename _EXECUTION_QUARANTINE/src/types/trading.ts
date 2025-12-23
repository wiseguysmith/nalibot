export enum TradeSignal {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD'
}

export interface Position {
  pair: string;
  quantity: number;
  averagePrice: number;
  entryTime: number;
  strategy: string;
  stopLoss: number;
  takeProfit: number;
}

export interface TradeResult {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: number;
  strategy: string;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  orderId?: string;
}

export interface Strategy {
  name: string;
  generateSignal(data: any[], current: any): TradeSignal;
}

export interface MarketData {
  timestamp: number;
  pair: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface OrderBook {
  pair: string;
  timestamp: number;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
}

export interface Ticker {
  pair: string;
  last: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

export interface Balance {
  totalUSD: number;
  availableUSD: number;
  assets: { [asset: string]: number };
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  status?: string;
}
