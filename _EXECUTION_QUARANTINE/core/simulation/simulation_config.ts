/**
 * Simulation Configuration
 * 
 * PHASE 8: High-Fidelity Simulation & Paper Trading
 * 
 * Configuration for simulated execution that mirrors live execution
 * as closely as possible while using fake capital.
 */

export interface SimulationConfig {
  /**
   * Fixed latency in milliseconds
   * Simulates network latency and exchange processing time
   */
  fixedLatencyMs: number;

  /**
   * Maximum liquidity percentage per fill
   * When simulating partial fills, this limits how much of available
   * depth can be consumed in a single fill
   * Example: 0.1 = 10% of available depth per fill
   */
  maxLiquidityPctPerFill: number;

  /**
   * Fee schedule
   * Maker/taker fees for simulated execution
   */
  feeSchedule: {
    maker: number; // Maker fee percentage (e.g., 0.001 = 0.1%)
    taker: number; // Taker fee percentage (e.g., 0.002 = 0.2%)
  };

  /**
   * Funding rate handling
   * How to handle funding rates in simulation
   */
  fundingRateHandling: {
    enabled: boolean;
    defaultRate: number; // Default funding rate if not available (e.g., 0.0001 = 0.01%)
    updateIntervalMs: number; // How often to update funding rate
  };

  /**
   * Slippage model
   * Deterministic slippage calculation
   */
  slippageModel: {
    type: 'LINEAR' | 'SQUARE_ROOT'; // Linear or square root slippage model
    baseSlippageBps: number; // Base slippage in basis points (e.g., 5 = 0.05%)
    sizeImpactFactor: number; // Impact factor for trade size (0-1)
  };
}

/**
 * Default simulation configuration
 * 
 * Conservative defaults that mirror realistic exchange behavior
 */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  fixedLatencyMs: 100, // 100ms latency
  maxLiquidityPctPerFill: 0.1, // 10% of available depth per fill
  feeSchedule: {
    maker: 0.001, // 0.1% maker fee
    taker: 0.002  // 0.2% taker fee
  },
  fundingRateHandling: {
    enabled: true,
    defaultRate: 0.0001, // 0.01% default funding rate
    updateIntervalMs: 8 * 60 * 60 * 1000 // 8 hours
  },
  slippageModel: {
    type: 'SQUARE_ROOT', // Square root model (more realistic for larger trades)
    baseSlippageBps: 5, // 0.05% base slippage
    sizeImpactFactor: 0.5 // Moderate size impact
  }
};




