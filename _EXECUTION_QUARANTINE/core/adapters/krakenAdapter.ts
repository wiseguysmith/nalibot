/**
 * Kraken Exchange Adapter
 * 
 * PHASE 1: This adapter is ONLY importable by ExecutionManager.
 * All execution methods must go through ExecutionManager.
 * 
 * Market data methods may be accessed through MarketDataService.
 */

import axios from 'axios';
import crypto from 'crypto';
import { Balance, Ticker } from '../../src/types/index';

interface KrakenOHLCResponse {
  error: string[];
  result: {
    [key: string]: [number, string, string, string, string, string, string, number][];
  };
}

/**
 * Kraken Exchange Adapter
 * 
 * CRITICAL: Execution methods (addOrder, placeBuyOrder, placeSellOrder) 
 * may ONLY be called by ExecutionManager.
 */
export class KrakenAdapter {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.kraken.com';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async makePublicRequest(endpoint: string, params: any = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/0/public/${endpoint}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error making public request to ${endpoint}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Status:', error.response?.status);
        console.error('URL:', error.config?.url);
      }
      return { error: ['API request failed'], result: {} };
    }
  }

  private async makePrivateRequest(endpoint: string, data: any = {}) {
    try {
      const nonce = Date.now().toString();
      const path = `/0/private/${endpoint}`;
      
      // Create signature
      const postData = new URLSearchParams({
        nonce,
        ...data
      }).toString();

      const signature = crypto
        .createHmac('sha512', Buffer.from(this.apiSecret, 'base64'))
        .update(path + postData)
        .digest('base64');

      const response = await axios.post(`${this.baseUrl}/0/private/${endpoint}`, postData, {
        headers: {
          'API-Key': this.apiKey,
          'API-Sign': signature
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error making private request to ${endpoint}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Status:', error.response?.status);
        console.error('URL:', error.config?.url);
      }
      return { error: ['API request failed'], result: {} };
    }
  }

  // Market Data Methods (can be accessed through MarketDataService)
  async getOHLCData(symbol: string, interval: number = 1): Promise<KrakenOHLCResponse> {
    return this.makePublicRequest('OHLC', { pair: symbol, interval });
  }

  async getTradablePairs() {
    return this.makePublicRequest('AssetPairs');
  }

  async getTickerInformation(pairs: string[]) {
    return this.makePublicRequest('Ticker', { pair: pairs.join(',') });
  }

  async getTicker(pair: string): Promise<Ticker | null> {
    const response = await this.makePublicRequest('Ticker', { pair });
    if (response.error && response.error.length > 0) {
      return null;
    }
    
    const pairData = response.result[pair];
    if (!pairData) return null;
    
    return {
      pair,
      last: parseFloat(pairData[6]),
      bid: parseFloat(pairData[0]),
      ask: parseFloat(pairData[2]),
      volume: parseFloat(pairData[9]),
      timestamp: Date.now()
    };
  }

  async getBalance(): Promise<Balance> {
    const response = await this.makePrivateRequest('Balance');
    if (response.error && response.error.length > 0) {
      throw new Error(`Kraken API error: ${response.error.join(', ')}`);
    }
    
    const assets = response.result;
    let totalUSD = 0;
    let availableUSD = 0;
    
    if (assets.ZUSD) {
      totalUSD += parseFloat(assets.ZUSD);
      availableUSD += parseFloat(assets.ZUSD);
    }
    
    return {
      asset: 'USD',
      free: availableUSD,
      total: totalUSD,
      totalUSD,
      availableUSD
    };
  }

  // EXECUTION METHODS - ONLY CALLABLE BY EXECUTIONMANAGER
  // These methods are marked as execution methods and should only be called
  // through ExecutionManager which enforces governance.

  /**
   * Add order to Kraken
   * 
   * PHASE 1: This method may ONLY be called by ExecutionManager.
   * Direct calls bypass governance and are forbidden.
   */
  async addOrder(orderData: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
  }) {
    // PHASE 1: In production, add runtime check that caller is ExecutionManager
    return this.makePrivateRequest('AddOrder', orderData);
  }

  /**
   * Place buy order
   * 
   * PHASE 1: This method may ONLY be called by ExecutionManager.
   */
  async placeBuyOrder(pair: string, quantity: number, price: number): Promise<any> {
    const orderData = {
      pair,
      type: 'buy' as const,
      ordertype: 'limit' as const,
      volume: quantity.toString(),
      price: price.toString()
    };
    
    const response = await this.addOrder(orderData);
    if (response.error && response.error.length > 0) {
      return { success: false, error: response.error[0] };
    }
    
    return { success: true, orderId: response.result.txid[0] };
  }

  /**
   * Place sell order
   * 
   * PHASE 1: This method may ONLY be called by ExecutionManager.
   */
  async placeSellOrder(pair: string, quantity: number, price: number): Promise<any> {
    const orderData = {
      pair,
      type: 'sell' as const,
      ordertype: 'limit' as const,
      volume: quantity.toString(),
      price: price.toString()
    };
    
    const response = await this.addOrder(orderData);
    if (response.error && response.error.length > 0) {
      return { success: false, error: response.error[0] };
    }
    
    return { success: true, orderId: response.result.txid[0] };
  }

  // Account Management Methods
  async getOrderStatus(txid: string) {
    return this.makePrivateRequest('QueryOrders', { txid });
  }

  async getOpenPositions(): Promise<any[]> {
    const response = await this.makePrivateRequest('OpenPositions');
    if (response.error && response.error.length > 0) {
      return [];
    }
    
    const positions = [];
    for (const [txid, position] of Object.entries(response.result)) {
      const pos = position as any;
      positions.push({
        pair: pos.pair,
        quantity: parseFloat(pos.vol),
        averagePrice: parseFloat(pos.cost) / parseFloat(pos.vol),
        entryTime: Date.now(),
        strategy: 'Unknown',
        stopLoss: 0,
        takeProfit: 0
      });
    }
    
    return positions;
  }

  async cancelOrder(txid: string) {
    return this.makePrivateRequest('CancelOrder', { txid });
  }

  async getOpenOrders() {
    return this.makePrivateRequest('OpenOrders');
  }

  async getTradeHistory() {
    return this.makePrivateRequest('TradesHistory');
  }
}

