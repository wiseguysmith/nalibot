/**
 * WebSocket Price Feed Service (TypeScript)
 * Real-time price feeds via WebSocket connections
 * Integrates with trading engines
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export enum ExchangeType {
  KRAKEN = 'kraken',
  BINANCE = 'binance',
  KUCOIN = 'kucoin',
  COINBASE = 'coinbase'
}

export interface PriceData {
  exchange: string;
  pair: string;
  price: number;
  volume: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  spread?: number;
}

export interface WebSocketConfig {
  exchange: ExchangeType;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
}

export class WebSocketPriceFeed extends EventEmitter {
  private exchange: ExchangeType;
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private isRunning: boolean = false;
  private reconnectDelay: number = 5000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private subscriptions: Map<string, boolean> = new Map();
  private priceData: Map<string, PriceData> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig) {
    super();
    this.exchange = config.exchange;
    this.reconnectDelay = config.reconnectDelay || 5000;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
  }

  private getWebSocketUrl(pair: string): string {
    const pairNormalized = pair.replace('/', '').toUpperCase();
    
    const urls: Record<ExchangeType, string> = {
      [ExchangeType.KRAKEN]: 'wss://ws.kraken.com',
      [ExchangeType.BINANCE]: `wss://stream.binance.com:9443/ws/${pairNormalized.toLowerCase()}@ticker`,
      [ExchangeType.KUCOIN]: 'wss://ws-api-spot.kucoin.com',
      [ExchangeType.COINBASE]: 'wss://ws-feed.pro.coinbase.com'
    };
    
    return urls[this.exchange] || urls[ExchangeType.KRAKEN];
  }

  private getSubscriptionMessage(pairs: string[]): any {
    if (this.exchange === ExchangeType.KRAKEN) {
      return {
        event: 'subscribe',
        pair: pairs,
        subscription: {
          name: 'ticker'
        }
      };
    } else if (this.exchange === ExchangeType.BINANCE) {
      // Binance uses URL-based subscriptions
      return null;
    } else if (this.exchange === ExchangeType.KUCOIN) {
      return {
        id: Date.now(),
        type: 'subscribe',
        topic: `/market/ticker:${pairs.join(',')}`,
        privateChannel: false,
        response: true
      };
    } else if (this.exchange === ExchangeType.COINBASE) {
      return {
        type: 'subscribe',
        product_ids: pairs,
        channels: ['ticker']
      };
    }
    
    return null;
  }

  async connect(pairs: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      const url = this.getWebSocketUrl(pairs[0] || 'BTC/USD');
      
      try {
        console.log(`Connecting to ${this.exchange} WebSocket: ${url}`);
        this.websocket = new WebSocket(url);
        
        this.websocket.on('open', () => {
          console.log(`Connected to ${this.exchange} WebSocket`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Subscribe to pairs
          if (pairs.length > 0) {
            this.subscribe(pairs);
          }
          
          // Start ping interval
          this.startPingInterval();
          
          resolve(true);
        });
        
        this.websocket.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });
        
        this.websocket.on('error', (error) => {
          console.error(`WebSocket error: ${error}`);
          this.isConnected = false;
          resolve(false);
        });
        
        this.websocket.on('close', () => {
          console.log('WebSocket connection closed');
          this.isConnected = false;
          this.stopPingInterval();
          
          if (this.isRunning) {
            this.scheduleReconnect(pairs);
          }
        });
        
      } catch (error) {
        console.error(`Failed to connect to WebSocket: ${error}`);
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  private subscribe(pairs: string[]): void {
    if (!this.isConnected || !this.websocket) {
      console.warn('Not connected to WebSocket');
      return;
    }
    
    const message = this.getSubscriptionMessage(pairs);
    if (message) {
      this.websocket.send(JSON.stringify(message));
      console.log(`Subscribed to pairs: ${pairs.join(', ')}`);
    }
    
    // Store subscriptions
    pairs.forEach(pair => {
      this.subscriptions.set(pair, true);
    });
  }

  private handleMessage(message: string): void {
    try {
      const data = JSON.parse(message);
      const priceData = this.parseMessage(data);
      
      if (priceData) {
        const pair = this.extractPairFromMessage(data) || 'UNKNOWN';
        this.priceData.set(pair, priceData);
        
        // Emit price update event
        this.emit('priceUpdate', pair, priceData);
        this.emit(`priceUpdate:${pair}`, priceData);
      }
    } catch (error) {
      console.error(`Error parsing message: ${error}`);
    }
  }

  private parseMessage(data: any): PriceData | null {
    if (this.exchange === ExchangeType.KRAKEN) {
      return this.parseKrakenMessage(data);
    } else if (this.exchange === ExchangeType.BINANCE) {
      return this.parseBinanceMessage(data);
    } else if (this.exchange === ExchangeType.KUCOIN) {
      return this.parseKuCoinMessage(data);
    } else if (this.exchange === ExchangeType.COINBASE) {
      return this.parseCoinbaseMessage(data);
    }
    
    return null;
  }

  private parseKrakenMessage(data: any): PriceData | null {
    if (Array.isArray(data) && data.length >= 4) {
      const tickerData = data[1];
      if (Array.isArray(tickerData) && tickerData.length >= 4) {
        return {
          exchange: 'kraken',
          pair: this.extractPairFromMessage(data) || 'UNKNOWN',
          price: parseFloat(tickerData[0]),
          volume: parseFloat(tickerData[1]),
          timestamp: new Date().toISOString()
        };
      }
    }
    return null;
  }

  private parseBinanceMessage(data: any): PriceData | null {
    if (data.c) { // Current price
      return {
        exchange: 'binance',
        pair: this.extractPairFromMessage(data) || 'UNKNOWN',
        price: parseFloat(data.c),
        volume: parseFloat(data.v || 0),
        timestamp: new Date().toISOString()
      };
    }
    return null;
  }

  private parseKuCoinMessage(data: any): PriceData | null {
    if (data.type === 'message' && data.data) {
      const ticker = data.data;
      if (ticker.price) {
        return {
          exchange: 'kucoin',
          pair: this.extractPairFromMessage(data) || 'UNKNOWN',
          price: parseFloat(ticker.price),
          volume: parseFloat(ticker.volume || 0),
          timestamp: new Date().toISOString()
        };
      }
    }
    return null;
  }

  private parseCoinbaseMessage(data: any): PriceData | null {
    if (data.type === 'ticker' && data.price) {
      return {
        exchange: 'coinbase',
        pair: data.product_id || 'UNKNOWN',
        price: parseFloat(data.price),
        volume: parseFloat(data.volume_24h || 0),
        timestamp: new Date().toISOString(),
        bid: data.best_bid ? parseFloat(data.best_bid) : undefined,
        ask: data.best_ask ? parseFloat(data.best_ask) : undefined,
        spread: data.best_bid && data.best_ask 
          ? parseFloat(data.best_ask) - parseFloat(data.best_bid)
          : undefined
      };
    }
    return null;
  }

  private extractPairFromMessage(data: any): string | null {
    // Extract pair from message based on exchange format
    if (this.subscriptions.size > 0) {
      return Array.from(this.subscriptions.keys())[0];
    }
    return null;
  }

  private scheduleReconnect(pairs: string[]): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.isRunning = false;
      this.emit('maxReconnectAttemptsReached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(pairs);
    }, this.reconnectDelay);
  }

  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.websocket && this.isConnected) {
        this.websocket.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  async disconnect(): Promise<void> {
    this.isRunning = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopPingInterval();
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.isConnected = false;
    console.log('Disconnected from WebSocket');
  }

  getLatestPrice(pair: string): PriceData | undefined {
    return this.priceData.get(pair);
  }

  getAllPrices(): Map<string, PriceData> {
    return new Map(this.priceData);
  }

  start(pairs: string[]): void {
    this.isRunning = true;
    this.connect(pairs);
  }

  stop(): void {
    this.isRunning = false;
    this.disconnect();
  }
}

