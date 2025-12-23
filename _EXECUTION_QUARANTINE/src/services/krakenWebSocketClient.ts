/**
 * Kraken WebSocket Client
 * Specialized WebSocket client for Kraken exchange
 * Handles authentication and private channels
 */

import WebSocket from 'ws';
import crypto from 'crypto';
import { WebSocketPriceFeed, PriceData } from './websocketPriceFeed';

export interface KrakenWebSocketConfig {
  apiKey?: string;
  apiSecret?: string;
  subscribeToPrivate?: boolean;
}

export class KrakenWebSocketClient extends WebSocketPriceFeed {
  private apiKey?: string;
  private apiSecret?: string;
  private subscribeToPrivate: boolean;

  constructor(config: KrakenWebSocketConfig = {}) {
    super({ exchange: 'kraken' as any });
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.subscribeToPrivate = config.subscribeToPrivate || false;
  }

  private generateAuthToken(): string {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API key and secret required for authenticated channels');
    }

    // Kraken WebSocket authentication
    const nonce = Date.now().toString();
    const message = nonce + this.apiKey;
    const signature = crypto
      .createHmac('sha256', Buffer.from(this.apiSecret, 'base64'))
      .update(message)
      .digest('base64');

    return signature;
  }

  async subscribeToPrivateChannels(): Promise<void> {
    if (!this.subscribeToPrivate || !this.apiKey) {
      return;
    }

    if (!this.isConnected || !this.websocket) {
      throw new Error('Not connected to WebSocket');
    }

    const authToken = this.generateAuthToken();
    
    const subscribeMessage = {
      event: 'subscribe',
      subscription: {
        name: 'ownTrades'
      }
    };

    this.websocket.send(JSON.stringify(subscribeMessage));
    console.log('Subscribed to Kraken private channels');
  }

  protected parseKrakenMessage(data: any): PriceData | null {
    // Handle different Kraken message types
    if (Array.isArray(data)) {
      // Public ticker update
      if (data.length >= 4) {
        const tickerData = data[1];
        if (Array.isArray(tickerData) && tickerData.length >= 4) {
          return {
            exchange: 'kraken',
            pair: this.extractPairFromMessage(data) || 'UNKNOWN',
            price: parseFloat(tickerData[0]),
            volume: parseFloat(tickerData[1]),
            timestamp: new Date().toISOString(),
            bid: tickerData.length > 2 ? parseFloat(tickerData[2]) : undefined,
            ask: tickerData.length > 3 ? parseFloat(tickerData[3]) : undefined
          };
        }
      }
    } else if (data.event) {
      // Event messages (subscription confirmation, etc.)
      if (data.event === 'subscriptionStatus') {
        console.log(`Subscription status: ${data.status}`);
      }
    } else if (Array.isArray(data) && data[0] && typeof data[0] === 'number') {
      // Own trades or other private channel data
      // Handle private channel messages
      return null; // Private channels handled separately
    }
    
    return null;
  }

  async connect(pairs: string[]): Promise<boolean> {
    const connected = await super.connect(pairs);
    
    if (connected && this.subscribeToPrivate) {
      await this.subscribeToPrivateChannels();
    }
    
    return connected;
  }
}

