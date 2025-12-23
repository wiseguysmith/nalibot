/**
 * Arbitrage Types & Interfaces
 * 
 * PHASE 6: Arbitrage Execution Layer
 * 
 * Defines types and interfaces for arbitrage strategies.
 */

export enum ArbitrageType {
  FUNDING_ARB = 'FUNDING_ARB',      // Funding / carry arbitrage (single exchange)
  BASIS_ARB = 'BASIS_ARB'           // Volatility / instrument arbitrage (same asset)
}

export enum ArbitrageLegType {
  SPOT_LONG = 'SPOT_LONG',
  SPOT_SHORT = 'SPOT_SHORT',
  PERP_LONG = 'PERP_LONG',
  PERP_SHORT = 'PERP_SHORT'
}

export interface ArbitrageSignal {
  strategyId: string;
  arbitrageType: ArbitrageType;
  symbol: string;                    // Base symbol (e.g., 'BTC')
  edgeSize: number;                  // Expected profit (absolute)
  edgePercent: number;               // Expected profit (%)
  confidence: number;                // 0-1 confidence score
  estimatedFees: number;             // Estimated fees for both legs
  estimatedSlippage: number;         // Estimated slippage
  minimumProfitabilityThreshold: number; // Minimum profit to execute
  legs: ArbitrageLeg[];
  timestamp: Date;
}

export interface ArbitrageLeg {
  legId: string;
  legType: ArbitrageLegType;
  symbol: string;                    // Full symbol (e.g., 'BTC/USD' or 'BTC-PERP')
  side: 'buy' | 'sell';
  size: number;                      // Size in base currency
  expectedPrice: number;
  exchange: string;                  // Exchange identifier
  orderType: 'limit' | 'market';
  priority: number;                  // Execution priority (1 = first, 2 = second)
}

export interface ArbitrageExecutionResult {
  success: boolean;
  strategyId: string;
  arbitrageType: ArbitrageType;
  symbol: string;
  legsExecuted: number;
  legsTotal: number;
  legResults: LegExecutionResult[];
  totalProfit: number;
  totalFees: number;
  totalSlippage: number;
  executionTimeMs: number;
  timestamp: Date;
  failureReason?: string;
  requiresNeutralization: boolean;   // True if partial execution occurred
}

export interface LegExecutionResult {
  legId: string;
  success: boolean;
  orderId?: string;
  executedPrice: number;
  executedSize: number;
  fees: number;
  slippage: number;
  executionTimeMs: number;
  failureReason?: string;
}

export interface ArbitrageExecutionConfig {
  maxSlippagePercent: number;        // Maximum acceptable slippage (%)
  maxExecutionDelayMs: number;       // Maximum acceptable execution delay
  minEdgePercent: number;             // Minimum edge to execute (%)
  requireAtomicExecution: boolean;    // Require both legs or none
  neutralizationEnabled: boolean;    // Auto-neutralize on partial execution
}

