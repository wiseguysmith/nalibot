/**
 * Strategy Metadata System
 * 
 * PHASE 2: Regime-Aware Strategy Governance
 * 
 * Each strategy must declare metadata in a standard format.
 * Strategies without metadata are DISABLED.
 * Metadata is required for execution eligibility.
 */

import { MarketRegime } from './regime_detector';

export type StrategyType = 'VOLATILITY' | 'STAT_ARB' | 'FUNDING_ARB' | 'BASIS_ARB';
export type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export enum StrategyState {
  DISABLED = 'DISABLED',
  SIM = 'SIM',
  ACTIVE = 'ACTIVE',
  PROBATION = 'PROBATION',
  PAUSED = 'PAUSED'
}

export interface StrategyMetadata {
  strategyId: string;
  strategyType: StrategyType;
  allowedRegimes: MarketRegime[]; // Regimes in which this strategy is allowed to trade
  riskProfile: RiskProfile;
  description: string;
  state: StrategyState;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Strategy Metadata Registry
 * 
 * Centralized registry for all strategy metadata.
 * Strategies must be registered before they can execute.
 */
export class StrategyMetadataRegistry {
  private strategies: Map<string, StrategyMetadata> = new Map();

  /**
   * Register a strategy with metadata
   */
  registerStrategy(metadata: Omit<StrategyMetadata, 'state' | 'createdAt' | 'updatedAt'>): void {
    const now = new Date();
    const fullMetadata: StrategyMetadata = {
      ...metadata,
      state: StrategyState.DISABLED, // Start disabled until explicitly activated
      createdAt: now,
      updatedAt: now
    };

    this.strategies.set(metadata.strategyId, fullMetadata);
    console.log(`[STRATEGY_REGISTRY] Registered strategy: ${metadata.strategyId} (${metadata.strategyType})`);
  }

  /**
   * Get strategy metadata
   */
  getStrategy(strategyId: string): StrategyMetadata | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): StrategyMetadata[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get active strategies
   */
  getActiveStrategies(): StrategyMetadata[] {
    return Array.from(this.strategies.values()).filter(
      s => s.state === StrategyState.ACTIVE || s.state === StrategyState.PROBATION
    );
  }

  /**
   * Update strategy state
   */
  updateStrategyState(strategyId: string, newState: StrategyState, reason?: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      console.warn(`[STRATEGY_REGISTRY] Strategy not found: ${strategyId}`);
      return false;
    }

    const previousState = strategy.state;
    strategy.state = newState;
    strategy.updatedAt = new Date();

    console.log(
      `[STRATEGY_REGISTRY] Strategy ${strategyId} state changed: ${previousState} → ${newState}${reason ? ` (${reason})` : ''}`
    );

    return true;
  }

  /**
   * Check if strategy is eligible for execution
   * 
   * A strategy is eligible if:
   * - State is ACTIVE or PROBATION
   * - Current regime is in allowedRegimes
   */
  isStrategyEligible(strategyId: string, currentRegime: MarketRegime): {
    eligible: boolean;
    reason?: string;
  } {
    const strategy = this.strategies.get(strategyId);
    
    if (!strategy) {
      return {
        eligible: false,
        reason: `Strategy ${strategyId} not registered`
      };
    }

    // Check state
    if (strategy.state === StrategyState.DISABLED) {
      return {
        eligible: false,
        reason: `Strategy ${strategyId} is DISABLED`
      };
    }

    if (strategy.state === StrategyState.PAUSED) {
      return {
        eligible: false,
        reason: `Strategy ${strategyId} is PAUSED`
      };
    }

    // Check regime eligibility
    if (!strategy.allowedRegimes.includes(currentRegime)) {
      return {
        eligible: false,
        reason: `Strategy ${strategyId} not allowed in ${currentRegime} regime (allowed: ${strategy.allowedRegimes.join(', ')})`
      };
    }

    // Strategy is eligible
    return { eligible: true };
  }

  /**
   * Get strategies eligible for current regime
   */
  getEligibleStrategies(currentRegime: MarketRegime): StrategyMetadata[] {
    return Array.from(this.strategies.values()).filter(strategy => {
      const check = this.isStrategyEligible(strategy.strategyId, currentRegime);
      return check.eligible;
    });
  }
}

/**
 * Default strategy metadata definitions
 * 
 * These are example registrations. In production, strategies should
 * register themselves during initialization.
 */
export function registerDefaultStrategies(registry: StrategyMetadataRegistry): void {
  // Volatility strategies - work best in FAVORABLE regime
  registry.registerStrategy({
    strategyId: 'volatility_breakout',
    strategyType: 'VOLATILITY',
    allowedRegimes: [MarketRegime.FAVORABLE],
    riskProfile: 'AGGRESSIVE',
    description: 'Volatility breakout strategy - trades on volatility expansion'
  });

  registry.registerStrategy({
    strategyId: 'trend_following',
    strategyType: 'VOLATILITY',
    allowedRegimes: [MarketRegime.FAVORABLE],
    riskProfile: 'MODERATE',
    description: 'Trend following strategy - requires clear trends'
  });

  // Statistical arbitrage - can work in FAVORABLE or UNKNOWN
  registry.registerStrategy({
    strategyId: 'mean_reversion',
    strategyType: 'STAT_ARB',
    allowedRegimes: [MarketRegime.FAVORABLE, MarketRegime.UNKNOWN],
    riskProfile: 'MODERATE',
    description: 'Mean reversion strategy - works in range-bound markets'
  });

  registry.registerStrategy({
    strategyId: 'statistical_arbitrage',
    strategyType: 'STAT_ARB',
    allowedRegimes: [MarketRegime.FAVORABLE],
    riskProfile: 'MODERATE',
    description: 'Statistical arbitrage - requires market structure'
  });

  // Funding/carry arbitrage - can work in various regimes
  registry.registerStrategy({
    strategyId: 'funding_arbitrage',
    strategyType: 'FUNDING_ARB',
    allowedRegimes: [MarketRegime.FAVORABLE, MarketRegime.UNKNOWN],
    riskProfile: 'CONSERVATIVE',
    description: 'Funding rate arbitrage - market-neutral strategy'
  });

  registry.registerStrategy({
    strategyId: 'grid_trading',
    strategyType: 'STAT_ARB',
    allowedRegimes: [MarketRegime.FAVORABLE, MarketRegime.UNKNOWN],
    riskProfile: 'MODERATE',
    description: 'Grid trading strategy - works in range-bound markets'
  });
}

