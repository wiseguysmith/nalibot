export interface Trade {
  id: string;
  timestamp: string;
  side: 'buy' | 'sell';
  type?: 'buy' | 'sell'; // Keep for backward compatibility
  price: number;
  amount: number;
  size?: number; // Keep for backward compatibility
  profit?: number;
  pnl?: string;
  symbol: string;
  status: 'pending' | 'completed' | 'canceled' | 'failed';
}

export interface PerformanceMetrics {
  timestamps: number[];
  profits: number[];
  trades: number[];
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  dailyReturns: number[];
}

export interface MLPrediction {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Live Trading Types
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
  stopLoss?: number;
  takeProfit?: number;
}

export interface TradeResult {
  success: boolean;
  orderId?: string;
  error?: string;
  executionPrice?: number;
  quantity?: number;
  timestamp: number;
  strategy: string;
  signal: TradeSignal;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  isActive: boolean;
}

export interface MarketData {
  pair: string;
  price: number;
  volume: number;
  timestamp: number;
}

export interface OrderBook {
  pair: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export interface Ticker {
  pair: string;
  last: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
}

export interface Balance {
  asset: string;
  free: number;
  total: number;
  totalUSD: number;
  availableUSD: number;
}

export interface OrderResult {
  orderId: string;
  status: string;
  filled: number;
  remaining: number;
  averagePrice: number;
}

export interface LiveTrade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  strategy: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled' | 'failed' | 'executed';
  profit?: number;
}

export interface StrategyPerformance {
  name: string;
  totalPnL: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  exposure: number;
  profitFactor: number;
} 