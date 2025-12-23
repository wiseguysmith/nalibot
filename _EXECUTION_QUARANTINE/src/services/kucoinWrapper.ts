import axios from 'axios';
import crypto from 'crypto';

interface KuCoinBalance {
  currency: string;
  available: string;
  holds: string;
  total: string;
}

interface KuCoinTicker {
  symbol: string;
  price: string;
  size: string;
  bestBid: string;
  bestAsk: string;
}

interface KuCoinOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  size: string;
  price?: string;
  status: 'active' | 'done' | 'cancel';
  createdAt: number;
}

export class KuCoinWrapper {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;
  private baseUrl: string = 'https://api.kucoin.com';

  constructor(apiKey: string, apiSecret: string, passphrase: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  private async makeRequest(method: string, endpoint: string, data: any = {}) {
    const timestamp = Date.now().toString();
    const signature = this.createSignature(method, endpoint, timestamp, data);
    const passphrase = this.createPassphrase(timestamp);

    const headers = {
      'KC-API-KEY': this.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': passphrase,
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers,
        data: method === 'POST' ? data : undefined,
        params: method === 'GET' ? data : undefined
      });

      return response.data;
    } catch (error) {
      console.error('KuCoin API error:', error.response?.data || error.message);
      throw error;
    }
  }

  private createSignature(method: string, endpoint: string, timestamp: string, data: any): string {
    const message = timestamp + method + endpoint + JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
  }

  private createPassphrase(timestamp: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(this.passphrase + timestamp)
      .digest('base64');
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ data: KuCoinBalance[] }> {
    return this.makeRequest('GET', '/api/v1/accounts');
  }

  /**
   * Get specific currency balance
   */
  async getCurrencyBalance(currency: string): Promise<KuCoinBalance | null> {
    const balance = await this.getBalance();
    return balance.data.find(acc => acc.currency === currency) || null;
  }

  /**
   * Get market ticker
   */
  async getTicker(symbol: string): Promise<{ data: KuCoinTicker }> {
    return this.makeRequest('GET', `/api/v1/market/orderbook/level1?symbol=${symbol}`);
  }

  /**
   * Get current price
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const ticker = await this.getTicker(symbol);
    return parseFloat(ticker.data.price);
  }

  /**
   * Place order
   */
  async placeOrder(orderData: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    size: string;
    price?: string;
  }): Promise<{ data: { orderId: string } }> {
    return this.makeRequest('POST', '/api/v1/orders', orderData);
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<{ data: KuCoinOrder }> {
    return this.makeRequest('GET', `/api/v1/orders/${orderId}`);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<{ data: { cancelledOrderIds: string[] } }> {
    return this.makeRequest('DELETE', `/api/v1/orders/${orderId}`);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<{ data: { items: KuCoinOrder[] } }> {
    const params = symbol ? { symbol } : {};
    return this.makeRequest('GET', '/api/v1/orders', params);
  }

  /**
   * Get trading pairs
   */
  async getTradingPairs(): Promise<{ data: any[] }> {
    return this.makeRequest('GET', '/api/v1/symbols');
  }

  /**
   * Get 24hr stats
   */
  async get24hrStats(symbol: string): Promise<{ data: any }> {
    return this.makeRequest('GET', `/api/v1/market/stats?symbol=${symbol}`);
  }

  /**
   * Get historical data (OHLCV)
   */
  async getHistoricalData(symbol: string, type: string = '1min', startAt?: number, endAt?: number): Promise<{ data: any[] }> {
    const params: any = { symbol, type };
    if (startAt) params.startAt = startAt;
    if (endAt) params.endAt = endAt;
    
    return this.makeRequest('GET', '/api/v1/market/candles', params);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch (error) {
      console.error('KuCoin connection test failed:', error);
      return false;
    }
  }

  /**
   * Get account overview
   */
  async getAccountOverview(): Promise<{ data: any }> {
    return this.makeRequest('GET', '/api/v1/accounts/ledgers');
  }

  /**
   * Place market buy order
   */
  async marketBuy(symbol: string, size: string): Promise<{ data: { orderId: string } }> {
    return this.placeOrder({
      symbol,
      side: 'buy',
      type: 'market',
      size
    });
  }

  /**
   * Place market sell order
   */
  async marketSell(symbol: string, size: string): Promise<{ data: { orderId: string } }> {
    return this.placeOrder({
      symbol,
      side: 'sell',
      type: 'market',
      size
    });
  }

  /**
   * Place limit buy order
   */
  async limitBuy(symbol: string, size: string, price: string): Promise<{ data: { orderId: string } }> {
    return this.placeOrder({
      symbol,
      side: 'buy',
      type: 'limit',
      size,
      price
    });
  }

  /**
   * Place limit sell order
   */
  async limitSell(symbol: string, size: string, price: string): Promise<{ data: { orderId: string } }> {
    return this.placeOrder({
      symbol,
      side: 'sell',
      type: 'limit',
      size,
      price
    });
  }

  /**
   * Calculate order size from USD amount
   */
  async calculateOrderSize(symbol: string, usdAmount: number): Promise<string> {
    const price = await this.getCurrentPrice(symbol);
    const size = usdAmount / price;
    return size.toFixed(8); // KuCoin precision
  }

  /**
   * Get portfolio value in USD
   */
  async getPortfolioValue(): Promise<number> {
    try {
      const balance = await this.getBalance();
      let totalValue = 0;

      for (const account of balance.data) {
        const amount = parseFloat(account.available);
        if (amount > 0) {
          if (account.currency === 'USDT' || account.currency === 'USD') {
            totalValue += amount;
          } else {
            // Get price for other currencies
            try {
              const price = await this.getCurrentPrice(`${account.currency}-USDT`);
              totalValue += amount * price;
            } catch (error) {
              console.warn(`Could not get price for ${account.currency}`);
            }
          }
        }
      }

      return totalValue;
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      return 0;
    }
  }
} 