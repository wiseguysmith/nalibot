/**
 * Market Data Service
 * Integrates WebSocket price feeds with trading engines
 * Provides unified market data interface
 */

import { WebSocketPriceFeed, PriceData, ExchangeType } from './websocketPriceFeed';
import { KrakenWebSocketClient } from './krakenWebSocketClient';
import { EventEmitter } from 'events';

export interface MarketData {
  price: number;
  volume: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  spread?: number;
  volatility?: number;
  rsi?: number;
  macd?: number;
  emaShort?: number;
  emaLong?: number;
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export class MarketDataService extends EventEmitter {
  private priceFeed: WebSocketPriceFeed | KrakenWebSocketClient;
  private subscribedPairs: Set<string> = new Set();
  private marketDataCache: Map<string, MarketData> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private useWebSocket: boolean = true;

  constructor(exchange: ExchangeType = ExchangeType.KRAKEN, useWebSocket: boolean = true) {
    super();
    this.useWebSocket = useWebSocket;
    
    if (exchange === ExchangeType.KRAKEN && process.env.KRAKEN_API_KEY) {
      this.priceFeed = new KrakenWebSocketClient({
        apiKey: process.env.KRAKEN_API_KEY,
        apiSecret: process.env.KRAKEN_API_SECRET,
        subscribeToPrivate: false
      });
    } else {
      this.priceFeed = new WebSocketPriceFeed({ exchange });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.priceFeed.on('priceUpdate', (pair: string, priceData: PriceData) => {
      this.handlePriceUpdate(pair, priceData);
    });

    this.priceFeed.on('maxReconnectAttemptsReached', () => {
      this.emit('error', new Error('Max WebSocket reconnect attempts reached'));
    });
  }

  private handlePriceUpdate(pair: string, priceData: PriceData): void {
    const marketData: MarketData = {
      price: priceData.price,
      volume: priceData.volume,
      timestamp: priceData.timestamp,
      bid: priceData.bid,
      ask: priceData.ask,
      spread: priceData.spread
    };

    // Update cache
    this.marketDataCache.set(pair, marketData);

    // Debug logging
    console.log(`[WS] Price Update: ${pair} = $${priceData.price.toFixed(2)}`);

    // Emit market data event (triggers strategy evaluation)
    this.emit('marketData', pair, marketData);
    this.emit(`marketData:${pair}`, marketData);
  }

  async start(pairs: string[]): Promise<void> {
    this.subscribedPairs = new Set(pairs);
    
    if (this.useWebSocket) {
      // Start WebSocket feed (primary method)
      console.log(`[MARKET DATA] Starting WebSocket feed for pairs: ${pairs.join(', ')}`);
      try {
        if (this.priceFeed instanceof WebSocketPriceFeed) {
          this.priceFeed.start(pairs);
        } else {
          await this.priceFeed.connect(pairs);
        }
        
        // Set up reconnection handler
        this.priceFeed.on('error', (error) => {
          console.error('[MARKET DATA] WebSocket error, falling back to REST:', error);
          this.startPolling(pairs);
        });
        
        this.priceFeed.on('close', () => {
          console.warn('[MARKET DATA] WebSocket closed, falling back to REST');
          this.startPolling(pairs);
        });
      } catch (error) {
        console.error('[MARKET DATA] WebSocket connection failed, using REST fallback:', error);
        this.startPolling(pairs);
      }
    } else {
      // Fallback to polling
      this.startPolling(pairs);
    }
  }

  private startPolling(pairs: string[]): void {
    // Fallback polling implementation (ONLY used if WebSocket fails)
    console.warn('[MARKET DATA] WebSocket unavailable, falling back to REST polling');
    this.updateInterval = setInterval(async () => {
      for (const pair of pairs) {
        try {
          // TODO: Fetch from REST API
          // For now, emit cached data
          const cached = this.marketDataCache.get(pair);
          if (cached) {
            this.emit('marketData', pair, cached);
          }
        } catch (error) {
          console.error(`Error polling ${pair}:`, error);
        }
      }
    }, 5000); // Poll every 5 seconds
  }

  stop(): void {
    if (this.priceFeed instanceof WebSocketPriceFeed) {
      this.priceFeed.stop();
    } else {
      this.priceFeed.disconnect();
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  getMarketData(pair: string): MarketData | undefined {
    return this.marketDataCache.get(pair);
  }

  getAllMarketData(): Map<string, MarketData> {
    return new Map(this.marketDataCache);
  }

  subscribe(pair: string): void {
    if (!this.subscribedPairs.has(pair)) {
      this.subscribedPairs.add(pair);
      const pairs = Array.from(this.subscribedPairs);
      
      if (this.priceFeed instanceof WebSocketPriceFeed) {
        // Reconnect with new pairs
        this.priceFeed.stop();
        this.priceFeed.start(pairs);
      } else {
        this.priceFeed.connect(pairs);
      }
    }
  }

  unsubscribe(pair: string): void {
    this.subscribedPairs.delete(pair);
    this.marketDataCache.delete(pair);
  }

  // Calculate technical indicators (simplified - would use actual indicator library)
  calculateIndicators(pair: string, historicalData: number[]): MarketData | undefined {
    const currentData = this.marketDataCache.get(pair);
    if (!currentData || historicalData.length < 20) {
      return currentData;
    }

    // Calculate RSI (simplified)
    const rsi = this.calculateRSI(historicalData, 14);
    
    // Calculate EMA
    const emaShort = this.calculateEMA(historicalData, 9);
    const emaLong = this.calculateEMA(historicalData, 21);
    
    // Calculate Bollinger Bands
    const bb = this.calculateBollingerBands(historicalData, 20, 2);

    return {
      ...currentData,
      rsi,
      emaShort,
      emaLong,
      bollingerBands: bb
    };
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateBollingerBands(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const avg = prices.reduce((a, b) => a + b) / prices.length;
      return { upper: avg, middle: avg, lower: avg };
    }
    
    const slice = prices.slice(-period);
    const middle = slice.reduce((a, b) => a + b) / period;
    
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: middle + (standardDeviation * stdDev),
      middle,
      lower: middle - (standardDeviation * stdDev)
    };
  }
}
