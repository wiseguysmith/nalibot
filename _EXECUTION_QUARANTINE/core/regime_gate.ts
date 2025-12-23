/**
 * Regime Gate
 * 
 * PHASE 2: Regime-Aware Strategy Governance
 * 
 * This gate checks regime eligibility BEFORE execution requests reach Phase 1 governance.
 * It ensures strategies can only execute when the market regime is compatible.
 * 
 * Flow:
 * Strategy generates signal → RegimeGate.checkEligibility() → (if eligible) → Phase 1 PermissionGate → Execution
 */

import { MarketRegime, RegimeDetector, RegimeResult } from './regime_detector';
import { StrategyMetadataRegistry, StrategyState } from './strategy_metadata';

export interface RegimeGateResult {
  allowed: boolean;
  reason?: string;
  regime?: MarketRegime;
  regimeConfidence?: number;
  strategyEligible?: boolean;
}

/**
 * Regime Gate
 * 
 * Checks if a strategy is eligible to execute based on:
 * 1. Current market regime
 * 2. Strategy's allowed regimes
 * 3. Strategy's lifecycle state
 */
export class RegimeGate {
  private regimeDetector: RegimeDetector;
  private strategyRegistry: StrategyMetadataRegistry;
  private priceHistory: Map<string, number[]> = new Map(); // Symbol -> price history

  constructor(
    regimeDetector: RegimeDetector,
    strategyRegistry: StrategyMetadataRegistry
  ) {
    this.regimeDetector = regimeDetector;
    this.strategyRegistry = strategyRegistry;
  }

  /**
   * Update price history for regime detection
   * 
   * Call this regularly with latest prices to keep regime detection current.
   */
  updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol)!;
    history.push(price);

    // Keep only last 100 prices (enough for regime detection)
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Check if strategy is eligible to execute based on regime
   * 
   * This check happens BEFORE Phase 1 governance.
   * If this returns false, the execution request should not proceed.
   */
  checkEligibility(strategyId: string, symbol: string): RegimeGateResult {
    // Get current regime
    const priceData = this.priceHistory.get(symbol);
    
    if (!priceData || priceData.length < 10) {
      // Not enough data - default to safety (UNKNOWN)
      return {
        allowed: false,
        reason: `Insufficient price history for ${symbol} - defaulting to safety`,
        regime: MarketRegime.UNKNOWN,
        regimeConfidence: 0,
        strategyEligible: false
      };
    }

    const regimeResult = this.regimeDetector.getCurrentRegime(priceData);

    // Check strategy eligibility
    const eligibilityCheck = this.strategyRegistry.isStrategyEligible(strategyId, regimeResult.regime);

    if (!eligibilityCheck.eligible) {
      return {
        allowed: false,
        reason: eligibilityCheck.reason,
        regime: regimeResult.regime,
        regimeConfidence: regimeResult.confidence,
        strategyEligible: false
      };
    }

    // Strategy is eligible for current regime
    return {
      allowed: true,
      regime: regimeResult.regime,
      regimeConfidence: regimeResult.confidence,
      strategyEligible: true
    };
  }

  /**
   * Get current regime for a symbol
   */
  getCurrentRegime(symbol: string): RegimeResult | null {
    const priceData = this.priceHistory.get(symbol);
    if (!priceData || priceData.length < 10) {
      return null;
    }

    return this.regimeDetector.getCurrentRegime(priceData);
  }

  /**
   * Get all eligible strategies for current regime
   */
  getEligibleStrategies(symbol: string): string[] {
    const regimeResult = this.getCurrentRegime(symbol);
    if (!regimeResult) {
      return [];
    }

    const eligible = this.strategyRegistry.getEligibleStrategies(regimeResult.regime);
    return eligible.map(s => s.strategyId);
  }
}

