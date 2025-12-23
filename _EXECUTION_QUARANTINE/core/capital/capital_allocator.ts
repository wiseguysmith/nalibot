/**
 * Capital Allocator
 * 
 * PHASE 3: Capital Intelligence & Governance
 * 
 * Centralized capital allocation logic.
 * Handles:
 * - Probation → zero capital decay
 * - Regime-confidence-based risk scaling
 * - Arbitrage minimum capital guarantees
 */

import { CapitalPool, CapitalPoolType } from './capital_pool';
import { StrategyCapitalAccountManager, StrategyCapitalAccount } from './strategy_capital_account';
import { StrategyMetadataRegistry, StrategyState } from '../strategy_metadata';
import { MarketRegime, RegimeResult } from '../regime_detector';

export interface AllocationConfig {
  // Probation decay
  probationDecayRate: number; // Percentage reduction per period
  probationDecayPeriods: number; // Number of periods before zero
  
  // Regime-confidence scaling (for aggressive strategies)
  minConfidenceForAllocation: number; // Minimum confidence to allocate (default 0.4)
  maxConfidenceMultiplier: number; // Max allocation multiplier at high confidence (default 1.5)
  
  // Arbitrage guarantees
  arbitrageMinCapital: number; // Minimum capital guaranteed for arbitrage pool
  arbitrageMinAllocationPerStrategy: number; // Minimum allocation per arbitrage strategy
}

/**
 * Capital Allocator
 * 
 * Manages capital allocation across strategies and pools.
 * Implements probation decay, regime scaling, and arbitrage guarantees.
 */
export class CapitalAllocator {
  private directionalPool: CapitalPool;
  private arbitragePool: CapitalPool;
  private accountManager: StrategyCapitalAccountManager;
  private strategyRegistry: StrategyMetadataRegistry;
  private config: AllocationConfig;

  constructor(
    directionalPool: CapitalPool,
    arbitragePool: CapitalPool,
    accountManager: StrategyCapitalAccountManager,
    strategyRegistry: StrategyMetadataRegistry,
    config?: Partial<AllocationConfig>
  ) {
    this.directionalPool = directionalPool;
    this.arbitragePool = arbitragePool;
    this.accountManager = accountManager;
    this.strategyRegistry = strategyRegistry;
    
    // Default configuration
    this.config = {
      probationDecayRate: 50, // 50% reduction per period
      probationDecayPeriods: 2, // Zero after 2 periods
      minConfidenceForAllocation: 0.4,
      maxConfidenceMultiplier: 1.5,
      arbitrageMinCapital: 100, // $100 minimum for arbitrage pool
      arbitrageMinAllocationPerStrategy: 50, // $50 minimum per arbitrage strategy
      ...config
    };
  }

  /**
   * Allocate capital to a strategy
   * 
   * This is the ONLY way strategies receive capital.
   * Strategies cannot self-allocate.
   */
  allocateToStrategy(
    strategyId: string,
    requestedAmount: number,
    regimeResult?: RegimeResult
  ): number {
    const strategy = this.strategyRegistry.getStrategy(strategyId);
    if (!strategy) {
      console.warn(`[CAPITAL_ALLOCATOR] Strategy not found: ${strategyId}`);
      return 0;
    }

    // Get or create account
    let account = this.accountManager.getAccount(strategyId);
    if (!account) {
      const poolType = this.getPoolTypeForStrategy(strategy.strategyType);
      account = this.accountManager.createAccount(strategyId, poolType);
    }

    // STEP 3: Probation → zero capital decay
    if (strategy.state === StrategyState.PROBATION) {
      return this.handleProbationAllocation(strategyId, account);
    }

    // If strategy is DISABLED or PAUSED, no allocation
    if (strategy.state === StrategyState.DISABLED || strategy.state === StrategyState.PAUSED) {
      this.accountManager.updateAllocation(strategyId, 0);
      return 0;
    }

    // Get appropriate pool
    const pool = account.poolType === CapitalPoolType.ARBITRAGE
      ? this.arbitragePool
      : this.directionalPool;

    // STEP 5: Arbitrage minimum capital guarantee
    if (account.poolType === CapitalPoolType.ARBITRAGE) {
      return this.allocateArbitrage(strategyId, requestedAmount, account, pool);
    }

    // STEP 4: Regime-confidence-based risk scaling (for aggressive strategies)
    if (strategy.riskProfile === 'AGGRESSIVE' && regimeResult) {
      return this.allocateWithRegimeScaling(
        strategyId,
        requestedAmount,
        account,
        pool,
        regimeResult
      );
    }

    // Standard allocation for non-aggressive strategies
    return this.allocateStandard(strategyId, requestedAmount, account, pool);
  }

  /**
   * STEP 3: Handle probation allocation (decay to zero)
   */
  private handleProbationAllocation(
    strategyId: string,
    account: StrategyCapitalAccount
  ): number {
    const currentAllocation = account.allocatedCapital;
    
    if (currentAllocation === 0) {
      return 0; // Already at zero
    }

    // Calculate decay
    const decayAmount = currentAllocation * (this.config.probationDecayRate / 100);
    const newAllocation = Math.max(0, currentAllocation - decayAmount);

    // Update allocation
    this.accountManager.updateAllocation(strategyId, newAllocation);

    // Release capital back to pool
    const pool = account.poolType === CapitalPoolType.ARBITRAGE
      ? this.arbitragePool
      : this.directionalPool;
    pool.releaseCapital(currentAllocation - newAllocation);

    console.log(
      `[CAPITAL_ALLOCATOR] Probation decay for ${strategyId}: ` +
      `$${currentAllocation.toFixed(2)} → $${newAllocation.toFixed(2)}`
    );

    return newAllocation;
  }

  /**
   * STEP 4: Allocate with regime-confidence scaling (aggressive strategies)
   */
  private allocateWithRegimeScaling(
    strategyId: string,
    requestedAmount: number,
    account: StrategyCapitalAccount,
    pool: CapitalPool,
    regimeResult: RegimeResult
  ): number {
    // UNKNOWN regime = zero capital
    if (regimeResult.regime === MarketRegime.UNKNOWN) {
      this.accountManager.updateAllocation(strategyId, 0);
      pool.releaseCapital(account.allocatedCapital);
      return 0;
    }

    // Check minimum confidence threshold
    if (regimeResult.confidence < this.config.minConfidenceForAllocation) {
      this.accountManager.updateAllocation(strategyId, 0);
      pool.releaseCapital(account.allocatedCapital);
      return 0;
    }

    // Scale allocation based on confidence
    // confidence < 0.4 → 0 (already handled)
    // 0.4-0.6 → 50% of requested
    // 0.6-0.8 → 100% of requested
    // > 0.8 → max multiplier of requested
    let scalingFactor = 1.0;
    if (regimeResult.confidence < 0.6) {
      scalingFactor = 0.5; // Reduced allocation
    } else if (regimeResult.confidence < 0.8) {
      scalingFactor = 1.0; // Normal allocation
    } else {
      scalingFactor = this.config.maxConfidenceMultiplier; // Max allocation
    }

    const scaledAmount = requestedAmount * scalingFactor;
    return this.allocateStandard(strategyId, scaledAmount, account, pool);
  }

  /**
   * STEP 5: Allocate arbitrage with minimum guarantee
   */
  private allocateArbitrage(
    strategyId: string,
    requestedAmount: number,
    account: StrategyCapitalAccount,
    pool: CapitalPool
  ): number {
    // Ensure arbitrage pool has minimum capital
    const poolMetrics = pool.getMetrics();
    if (poolMetrics.totalCapital < this.config.arbitrageMinCapital) {
      console.warn(
        `[CAPITAL_ALLOCATOR] Arbitrage pool below minimum: ` +
        `$${poolMetrics.totalCapital.toFixed(2)} < $${this.config.arbitrageMinCapital}`
      );
    }

    // Allocate at least minimum per strategy
    const minAllocation = Math.max(
      requestedAmount,
      this.config.arbitrageMinAllocationPerStrategy
    );

    // Check pool availability
    const available = pool.getAvailableCapital();
    if (available < minAllocation) {
      console.warn(
        `[CAPITAL_ALLOCATOR] Insufficient arbitrage capital: ` +
        `$${available.toFixed(2)} < $${minAllocation.toFixed(2)}`
      );
      return 0;
    }

    return this.allocateStandard(strategyId, minAllocation, account, pool);
  }

  /**
   * Standard allocation logic
   */
  private allocateStandard(
    strategyId: string,
    requestedAmount: number,
    account: StrategyCapitalAccount,
    pool: CapitalPool
  ): number {
    // Check if pool can allocate
    if (!pool.canAllocate(requestedAmount)) {
      const available = pool.getAvailableCapital();
      console.warn(
        `[CAPITAL_ALLOCATOR] Insufficient capital in ${account.poolType} pool: ` +
        `$${available.toFixed(2)} < $${requestedAmount.toFixed(2)}`
      );
      return 0;
    }

    // Release existing allocation
    if (account.allocatedCapital > 0) {
      pool.releaseCapital(account.allocatedCapital);
    }

    // Allocate new capital
    const allocated = pool.allocateCapital(requestedAmount);
    this.accountManager.updateAllocation(strategyId, allocated);

    return allocated;
  }

  /**
   * Get pool type for strategy type
   */
  private getPoolTypeForStrategy(strategyType: string): CapitalPoolType {
    if (strategyType === 'FUNDING_ARB' || strategyType === 'STAT_ARB') {
      return CapitalPoolType.ARBITRAGE;
    }
    return CapitalPoolType.DIRECTIONAL;
  }

  /**
   * Update capital based on P&L
   */
  updateCapitalFromPnL(strategyId: string, pnl: number): void {
    const account = this.accountManager.getAccount(strategyId);
    if (!account) {
      return;
    }

    const pool = account.poolType === CapitalPoolType.ARBITRAGE
      ? this.arbitragePool
      : this.directionalPool;

    pool.updateCapital(pnl);
  }

  /**
   * Get pool for strategy
   */
  getPoolForStrategy(strategyId: string): CapitalPool | null {
    const account = this.accountManager.getAccount(strategyId);
    if (!account) {
      return null;
    }

    return account.poolType === CapitalPoolType.ARBITRAGE
      ? this.arbitragePool
      : this.directionalPool;
  }
}

