/**
 * KrakenWrapper - Backward Compatibility Layer
 * 
 * PHASE 1: DEPRECATED - This file exists for backward compatibility only.
 * 
 * ⚠️ CRITICAL: Execution methods (addOrder, placeBuyOrder, placeSellOrder) 
 * are DEPRECATED and should NOT be used.
 * 
 * All execution must go through ExecutionManager.
 * 
 * Market data methods may still be used, but consider using MarketDataService instead.
 * 
 * Migration Path:
 * - For execution: Use ExecutionManager.executeTrade()
 * - For market data: Use MarketDataService or import from core/adapters (read-only)
 */

// Re-export adapter for backward compatibility
// PHASE 1: This allows existing code to continue working during migration
export { KrakenAdapter as KrakenWrapper } from '../../core/adapters/krakenAdapter';

/**
 * @deprecated Use ExecutionManager.executeTrade() instead
 * Execution methods are deprecated and will be removed.
 * All execution must go through ExecutionManager for governance enforcement.
 */
