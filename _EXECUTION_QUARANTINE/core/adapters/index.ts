/**
 * Exchange Adapters - Restricted Access
 * 
 * PHASE 1: Exchange adapters may ONLY be imported by ExecutionManager.
 * 
 * This module exports exchange adapters for use by ExecutionManager only.
 * All execution must go through ExecutionManager which enforces governance.
 * 
 * Market data access should go through MarketDataService, not direct adapter access.
 */

// PHASE 1: Export adapters - only ExecutionManager should import these
export { KrakenAdapter } from './krakenAdapter';

// PHASE 8: Export simulated execution adapter
export { SimulatedExecutionAdapter } from './simulatedExecutionAdapter';

// Re-export for backward compatibility during migration
// TODO: Remove after all code is migrated
export { KrakenAdapter as KrakenWrapper } from './krakenAdapter';

/**
 * Adapter Interface
 * 
 * All exchange adapters must implement execution methods:
 * - placeBuyOrder()
 * - placeSellOrder()
 * - addOrder()
 * 
 * These methods may ONLY be called by ExecutionManager.
 */
export interface ExchangeAdapter {
  placeBuyOrder(pair: string, quantity: number, price: number): Promise<any>;
  placeSellOrder(pair: string, quantity: number, price: number): Promise<any>;
  addOrder(orderData: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
  }): Promise<any>;
  
  // Market data methods (can be accessed through MarketDataService)
  getTicker(pair: string): Promise<any>;
  getTickerInformation(pairs: string[]): Promise<any>;
  getOHLCData(symbol: string, interval?: number): Promise<any>;
  getBalance(): Promise<any>;
}

