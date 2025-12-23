/**
 * Shadow Trading Configuration
 * 
 * PHASE 9: Shadow Trading & Execution Parity
 * 
 * Configuration for shadow execution mode that observes real market
 * outcomes without affecting capital or PnL.
 */

export interface ShadowConfig {
  /**
   * Observation window in milliseconds
   * How long to track market prices after simulated execution
   * Default: 5 minutes (300000ms)
   */
  observationWindowMs: number;

  /**
   * Symbols to track
   * If empty, tracks all symbols
   */
  trackedSymbols?: string[];

  /**
   * Latency reference in milliseconds
   * Reference latency for comparing simulated vs observed execution
   * Default: 100ms
   */
  latencyReferenceMs: number;

  /**
   * Price sampling interval in milliseconds
   * How often to sample market prices during observation window
   * Default: 1000ms (1 second)
   */
  priceSamplingIntervalMs: number;

  /**
   * Enable funding rate tracking
   * Track funding rate changes during observation window
   */
  enableFundingRateTracking: boolean;
}

/**
 * Default shadow configuration
 */
export const DEFAULT_SHADOW_CONFIG: ShadowConfig = {
  observationWindowMs: 5 * 60 * 1000, // 5 minutes
  trackedSymbols: [], // Track all symbols
  latencyReferenceMs: 100, // 100ms reference latency
  priceSamplingIntervalMs: 1000, // 1 second sampling
  enableFundingRateTracking: true
};




