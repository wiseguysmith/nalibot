/**
 * Account Risk Budget
 * 
 * PHASE 8: Formal Risk Budgeting
 * 
 * Each account has a formal, explicit risk budget that:
 * - Limits how much risk the account may express
 * - Adapts conservatively to market regime confidence
 * - Decays aggressively on losses
 * - Recovers slowly after drawdowns
 * - Allocates risk across strategies by performance
 * - Is explainable, deterministic, and observable
 */

export interface AccountRiskBudgetConfig {
  accountId: string;
  baselineRiskPct: number; // Fixed, conservative baseline (e.g., 2%)
  maxRiskPct: number; // Absolute cap (e.g., 5%)
  drawdownPenaltyFactor: number; // Multiplier for drawdown penalty (e.g., 1.5)
  recoveryRate: number; // Recovery rate per period (e.g., 0.1% per day)
  initialRiskPct?: number; // Optional initial risk (defaults to baseline)
}

export interface RiskBudgetState {
  baselineRiskPct: number;
  maxRiskPct: number;
  currentRiskPct: number;
  regimeScalingFactor: number; // Current regime-based scaling (0.6 to 1.0)
  drawdownPenaltyFactor: number;
  recoveryRate: number;
  lastDrawdownEvent?: Date;
  lastRecoveryEvent?: Date;
  lastUpdate: Date;
}

/**
 * Account Risk Budget
 * 
 * Manages account-level risk budget with:
 * - Fixed baseline risk
 * - Dynamic current risk
 * - Regime-adaptive scaling
 * - Loss decay and recovery
 */
export class AccountRiskBudget {
  private config: AccountRiskBudgetConfig;
  private state: RiskBudgetState;

  constructor(config: AccountRiskBudgetConfig) {
    this.config = config;
    
    // Initialize state
    this.state = {
      baselineRiskPct: config.baselineRiskPct,
      maxRiskPct: config.maxRiskPct,
      currentRiskPct: config.initialRiskPct ?? config.baselineRiskPct,
      regimeScalingFactor: 1.0, // Start at baseline (no scaling)
      drawdownPenaltyFactor: config.drawdownPenaltyFactor,
      recoveryRate: config.recoveryRate,
      lastUpdate: new Date()
    };

    // Validate configuration
    if (this.state.baselineRiskPct > this.state.maxRiskPct) {
      throw new Error(`Baseline risk ${this.state.baselineRiskPct}% exceeds max risk ${this.state.maxRiskPct}%`);
    }

    if (this.state.currentRiskPct > this.state.maxRiskPct) {
      this.state.currentRiskPct = this.state.maxRiskPct;
    }

    console.log(`[RISK_BUDGET:${config.accountId}] Initialized: baseline=${this.state.baselineRiskPct}%, max=${this.state.maxRiskPct}%, current=${this.state.currentRiskPct}%`);
  }

  /**
   * Get current risk budget state
   */
  getState(): Readonly<RiskBudgetState> {
    return { ...this.state };
  }

  /**
   * Get current effective risk percentage
   * 
   * Effective risk = currentRiskPct × regimeScalingFactor
   * Capped at maxRiskPct
   */
  getEffectiveRiskPct(): number {
    const effectiveRisk = this.state.currentRiskPct * this.state.regimeScalingFactor;
    return Math.min(effectiveRisk, this.state.maxRiskPct);
  }

  /**
   * Get baseline risk percentage
   */
  getBaselineRiskPct(): number {
    return this.state.baselineRiskPct;
  }

  /**
   * Get maximum risk percentage
   */
  getMaxRiskPct(): number {
    return this.state.maxRiskPct;
  }

  /**
   * Get current risk percentage (before regime scaling)
   */
  getCurrentRiskPct(): number {
    return this.state.currentRiskPct;
  }

  /**
   * Get regime scaling factor
   */
  getRegimeScalingFactor(): number {
    return this.state.regimeScalingFactor;
  }

  /**
   * Apply regime scaling
   * 
   * Only scales upward in FAVORABLE regime.
   * No scaling in UNKNOWN / UNFAVORABLE.
   * 
   * @param regime Current market regime
   * @param confidence Regime confidence (0-1)
   */
  applyRegimeScaling(regime: 'FAVORABLE' | 'UNFAVORABLE' | 'UNKNOWN', confidence: number): void {
    if (regime !== 'FAVORABLE') {
      // No scaling in UNFAVORABLE or UNKNOWN
      this.state.regimeScalingFactor = 1.0;
      return;
    }

    // Scale from 0.6 to 1.0 based on confidence
    // Confidence 0.4 → 0.6 scaling
    // Confidence 1.0 → 1.0 scaling (no additional scaling)
    const minScaling = 0.6;
    const maxScaling = 1.0;
    
    // Clamp confidence to [0.4, 1.0] range
    const clampedConfidence = Math.max(0.4, Math.min(1.0, confidence));
    
    // Linear interpolation: confidence 0.4 → 0.6, confidence 1.0 → 1.0
    const scaling = minScaling + (clampedConfidence - 0.4) * ((maxScaling - minScaling) / 0.6);
    
    this.state.regimeScalingFactor = Math.max(minScaling, Math.min(maxScaling, scaling));
    this.state.lastUpdate = new Date();

    console.log(`[RISK_BUDGET:${this.config.accountId}] Regime scaling: ${regime} (${(confidence * 100).toFixed(0)}% confidence) → factor=${this.state.regimeScalingFactor.toFixed(3)}`);
  }

  /**
   * Apply drawdown penalty
   * 
   * Immediately reduces current risk based on drawdown magnitude.
   * 
   * @param drawdownPct Current drawdown percentage
   */
  applyDrawdownPenalty(drawdownPct: number): void {
    // Penalty = drawdown × penalty factor
    // Example: 10% drawdown × 1.5 = 15% risk reduction
    const penaltyPct = drawdownPct * this.state.drawdownPenaltyFactor;
    
    // Reduce current risk by penalty
    const newRiskPct = Math.max(0, this.state.currentRiskPct - penaltyPct);
    
    const previousRisk = this.state.currentRiskPct;
    this.state.currentRiskPct = newRiskPct;
    this.state.lastDrawdownEvent = new Date();
    this.state.lastUpdate = new Date();

    console.log(`[RISK_BUDGET:${this.config.accountId}] Drawdown penalty: ${drawdownPct.toFixed(2)}% drawdown → ${previousRisk.toFixed(2)}% → ${newRiskPct.toFixed(2)}% risk`);
  }

  /**
   * Apply recovery
   * 
   * Slowly recovers risk over time.
   * Recovery rate is capped and monotonic.
   * 
   * @param daysSinceDrawdown Number of days since last drawdown event
   * @param regime Current market regime (recovery pauses if UNFAVORABLE)
   */
  applyRecovery(daysSinceDrawdown: number, regime: 'FAVORABLE' | 'UNFAVORABLE' | 'UNKNOWN'): void {
    // Recovery pauses if regime is UNFAVORABLE
    if (regime === 'UNFAVORABLE') {
      return;
    }

    // Recovery rate per day, capped
    const recoveryPct = Math.min(
      daysSinceDrawdown * this.state.recoveryRate,
      this.state.baselineRiskPct - this.state.currentRiskPct // Don't exceed baseline
    );

    if (recoveryPct > 0) {
      const previousRisk = this.state.currentRiskPct;
      this.state.currentRiskPct = Math.min(
        this.state.baselineRiskPct,
        this.state.currentRiskPct + recoveryPct
      );
      this.state.lastRecoveryEvent = new Date();
      this.state.lastUpdate = new Date();

      console.log(`[RISK_BUDGET:${this.config.accountId}] Recovery: ${daysSinceDrawdown} days → ${previousRisk.toFixed(2)}% → ${this.state.currentRiskPct.toFixed(2)}% risk`);
    }
  }

  /**
   * Reset risk budget to baseline
   * 
   * Used for manual reset or recovery completion.
   */
  resetToBaseline(): void {
    this.state.currentRiskPct = this.state.baselineRiskPct;
    this.state.regimeScalingFactor = 1.0;
    this.state.lastUpdate = new Date();

    console.log(`[RISK_BUDGET:${this.config.accountId}] Reset to baseline: ${this.state.baselineRiskPct}%`);
  }

  /**
   * Check if risk budget allows trade
   * 
   * @param tradeRiskPct Risk percentage required for trade
   * @returns true if trade is within risk budget
   */
  allowsTrade(tradeRiskPct: number): boolean {
    const effectiveRisk = this.getEffectiveRiskPct();
    return tradeRiskPct <= effectiveRisk;
  }

  /**
   * Get risk budget summary
   */
  getSummary(): {
    accountId: string;
    baselineRiskPct: number;
    maxRiskPct: number;
    currentRiskPct: number;
    effectiveRiskPct: number;
    regimeScalingFactor: number;
    lastDrawdownEvent?: Date;
    lastRecoveryEvent?: Date;
  } {
    return {
      accountId: this.config.accountId,
      baselineRiskPct: this.state.baselineRiskPct,
      maxRiskPct: this.state.maxRiskPct,
      currentRiskPct: this.state.currentRiskPct,
      effectiveRiskPct: this.getEffectiveRiskPct(),
      regimeScalingFactor: this.state.regimeScalingFactor,
      lastDrawdownEvent: this.state.lastDrawdownEvent,
      lastRecoveryEvent: this.state.lastRecoveryEvent
    };
  }
}

