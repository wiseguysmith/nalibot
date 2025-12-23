/**
 * Coinbase Advanced Trade Market Data Service
 * 
 * Read-only market data service for Coinbase Advanced Trade API.
 * Uses REST API to fetch live prices (no authentication required for public data).
 * 
 * PHASE 9: Shadow Trading - Live market data for parity metrics
 */

import { CONFIG } from '../config';

export interface CoinbaseMarketData {
  price: number;
  bid: number;
  ask: number;
  volume?: number;
  timestamp: Date;
}

export class CoinbaseMarketDataService {
  private baseUrl = 'https://api.coinbase.com/api/v3/brokerage/market/products';
  private cache: Map<string, { data: CoinbaseMarketData; timestamp: number }> = new Map();
  private cacheTtl = 1000; // 1 second cache TTL

  /**
   * Get market data for a trading pair
   * 
   * Converts pair format (e.g., "BTC/USD") to Coinbase product ID (e.g., "BTC-USD")
   */
  async getMarketData(pair: string): Promise<CoinbaseMarketData | null> {
    const endpoint = `https://api.coinbase.com/api/v3/brokerage/market/products`;
    
    try {
      // Convert pair format to Coinbase product ID
      const productId = this.convertPairToProductId(pair);
      if (!productId) {
        console.error(`[COINBASE_MARKET_DATA] Invalid pair format: ${pair}`);
        return null;
      }

      // Check cache
      const cached = this.cache.get(pair);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        return cached.data;
      }

      // Fetch from Coinbase Advanced Trade API
      // Public endpoint: GET /api/v3/brokerage/market/products/{product_id}/ticker
      const url = `${endpoint}/${productId}/ticker`;
      
      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
      } catch (fetchError) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error(`[COINBASE_MARKET_DATA] Fetch error for ${url}:`, errorMsg);
        return null;
      }
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Could not read error response';
        }
        console.error(`[COINBASE_MARKET_DATA] API error: ${response.status} ${response.statusText}`);
        console.error(`[COINBASE_MARKET_DATA] Endpoint: ${endpoint}`);
        console.error(`[COINBASE_MARKET_DATA] Product ID: ${productId}`);
        console.error(`[COINBASE_MARKET_DATA] Response: ${errorText.substring(0, 200)}`);
        return null;
      }

      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          console.error(`[COINBASE_MARKET_DATA] Invalid response structure for ${pair}`);
          return null;
        }
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`[COINBASE_MARKET_DATA] JSON parse error for ${pair}:`, errorMsg);
        return null;
      }
      
      // Coinbase Advanced Trade API ticker response structure:
      // {
      //   "trades": [...],
      //   "best_bid": "string",
      //   "best_ask": "string"
      // }
      
      // Extract best bid and ask (prices are strings in Coinbase API)
      const bestBidStr = data.best_bid;
      const bestAskStr = data.best_ask;
      
      if (!bestBidStr || !bestAskStr) {
        console.error(`[COINBASE_MARKET_DATA] Missing bid/ask in response for ${pair}`);
        console.error(`[COINBASE_MARKET_DATA] Response structure:`, JSON.stringify(data, null, 2).substring(0, 500));
        return null;
      }
      
      // Parse numeric values (Coinbase returns strings)
      const bestBid = parseFloat(String(bestBidStr));
      const bestAsk = parseFloat(String(bestAskStr));
      
      if (isNaN(bestBid) || isNaN(bestAsk) || bestBid <= 0 || bestAsk <= 0 || bestBid >= bestAsk) {
        console.error(`[COINBASE_MARKET_DATA] Invalid bid/ask values for ${pair}`);
        console.error(`[COINBASE_MARKET_DATA] best_bid: "${bestBidStr}" -> ${bestBid}`);
        console.error(`[COINBASE_MARKET_DATA] best_ask: "${bestAskStr}" -> ${bestAsk}`);
        return null;
      }
      
      // Derive last price from midpoint (most reliable for spot trading)
      // Coinbase ticker endpoint doesn't always include trades array
      let lastPrice = (bestBid + bestAsk) / 2;
      
      // Try to get latest trade price if available (more accurate)
      if (data.trades && Array.isArray(data.trades) && data.trades.length > 0) {
        // Trades are typically sorted newest first
        const latestTrade = data.trades[0];
        if (latestTrade && latestTrade.price) {
          const tradePrice = parseFloat(String(latestTrade.price));
          if (!isNaN(tradePrice) && tradePrice > 0) {
            lastPrice = tradePrice;
          }
        }
      }
      
      // Get timestamp (use current time if not available in response)
      let timestamp = new Date();
      if (data.trades && Array.isArray(data.trades) && data.trades.length > 0) {
        const latestTrade = data.trades[0];
        if (latestTrade && latestTrade.time) {
          try {
            const tradeTime = new Date(latestTrade.time);
            if (!isNaN(tradeTime.getTime())) {
              timestamp = tradeTime;
            }
          } catch (e) {
            // Use current time as fallback
          }
        }
      }

      const marketData: CoinbaseMarketData = {
        price: lastPrice,
        bid: bestBid,
        ask: bestAsk,
        volume: undefined, // Not available in ticker endpoint
        timestamp: timestamp
      };

      // Log success (only in debug mode to reduce noise)
      if (process.env.DEBUG_COINBASE_MARKET_DATA === 'true') {
        console.log(`[COINBASE_MARKET_DATA] Successfully parsed market data for ${pair}:`, {
          price: marketData.price.toFixed(2),
          bid: marketData.bid.toFixed(2),
          ask: marketData.ask.toFixed(2),
          timestamp: marketData.timestamp.toISOString()
        });
      }

      // Cache the result
      this.cache.set(pair, { data: marketData, timestamp: Date.now() });

      return marketData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[COINBASE_MARKET_DATA] Unexpected error fetching market data for ${pair}:`, errorMsg);
      if (errorStack) {
        console.error(`[COINBASE_MARKET_DATA] Stack:`, errorStack);
      }
      console.error(`[COINBASE_MARKET_DATA] Diagnostic:`, {
        endpoint,
        pair,
        productId: this.convertPairToProductId(pair)
      });
      return null;
    }
  }

  /**
   * Get market data synchronously (from cache if available)
   * 
   * NOTE: This method is separate from async getMarketData() to avoid method signature conflicts
   */
  getCachedMarketData(pair: string): CoinbaseMarketData | null {
    const cached = this.cache.get(pair);
    if (cached) {
      return cached.data;
    }
    return null;
  }

  /**
   * Convert trading pair format to Coinbase product ID
   * 
   * Examples:
   * - "BTC/USD" -> "BTC-USD"
   * - "ETH/USD" -> "ETH-USD"
   * - "BTC/USDT" -> "BTC-USDT"
   */
  private convertPairToProductId(pair: string): string | null {
    // Handle common formats
    const normalized = pair.replace('/', '-').toUpperCase();
    
    // Validate format (should be like BTC-USD)
    if (!normalized.match(/^[A-Z0-9]+-[A-Z0-9]+$/)) {
      return null;
    }

    return normalized;
  }

  /**
   * Subscribe to market data updates (polling-based)
   * 
   * For shadow trading, we poll at regular intervals
   */
  startPolling(pairs: string[], intervalMs: number = 1000): void {
    setInterval(async () => {
      for (const pair of pairs) {
        await this.getMarketData(pair);
      }
    }, intervalMs);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

