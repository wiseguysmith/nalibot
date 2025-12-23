/**
 * Risk Governor
 * 
 * Supreme authority over trade execution.
 * Enforces system-wide, per-mode, per-strategy, and per-asset risk limits.
 * 
 * PHASE 1: Governance & Survival
 * This module provides authoritative risk enforcement, not advisory checks.
 */

export type RiskState = 'ACTIVE' | 'PROBATION' | 'PAUSED' | 'SHUTDOWN';

export interface TradeRequest {
  strategy: string;
  pair: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  estimatedValue: number; // USD value of the trade
  stopLoss?: number;
  takeProfit?: number;
}

export interface TradeResult {
  success: boolean;
  pair: string;
  strategy: string;
  pnl?: number; // Profit/Loss in USD
  executedValue?: number; // Actual executed value
  timestamp: Date;
  orderId?: string; // Exchange order ID (if available)
  executionPrice?: number; // Actual execution price
  quantity?: number; // Actual executed quantity
}

export interface RiskMetrics {
  systemDrawdown: number; // System-wide drawdown percentage
  systemDailyLoss: number; // System-wide daily loss in USD
  strategyDrawdowns: Map<string, number>; // Per-strategy drawdown
  strategyDailyLosses: Map<string, number>; // Per-strategy daily loss
  assetExposures: Map<string, number>; // Per-asset exposure in USD
}

export interface RiskLimits {
  maxSystemDrawdown: number; // Maximum system-wide drawdown percentage
  maxSystemDailyLoss: number; // Maximum system-wide daily loss in USD
  maxStrategyDrawdown: number; // Maximum per-strategy drawdown percentage
  maxStrategyDailyLoss: number; // Maximum per-strategy daily loss in USD
  maxAssetExposure: number; // Maximum exposure per asset in USD
  maxPositionSize: number; // Maximum position size percentage
}

/**
 * Risk Governor
 * 
 * Maintains system state and enforces risk limits.
 * If state is SHUTDOWN → approveTrade MUST always return false.
 * If drawdown exceeds limits → automatically transition to SHUTDOWN.
 */
export class RiskGovernor {
  private state: RiskState = 'ACTIVE';
  private stateHistory: Array<{ state: RiskState; timestamp: Date; reason: string }> = [];
  
  private metrics: RiskMetrics = {
    systemDrawdown: 0,
    systemDailyLoss: 0,
    strategyDrawdowns: new Map(),
    strategyDailyLosses: new Map(),
    assetExposures: new Map()
  };

  private limits: RiskLimits = {
    maxSystemDrawdown: 25, // 25% max system drawdown
    maxSystemDailyLoss: 1000, // $1000 max daily loss
    maxStrategyDrawdown: 30, // 30% max per-strategy drawdown
    maxStrategyDailyLoss: 500, // $500 max per-strategy daily loss
    maxAssetExposure: 2000, // $2000 max per-asset exposure
    maxPositionSize: 30 // 30% max position size
  };

  private initialCapital: number = 1000; // Track initial capital for drawdown calculation
  private currentCapital: number = 1000; // Current capital
  private dailyResetTimestamp: Date = new Date();

  constructor(initialCapital: number = 1000, customLimits?: Partial<RiskLimits>) {
    this.initialCapital = initialCapital;
    this.currentCapital = initialCapital;
    
    if (customLimits) {
      this.limits = { ...this.limits, ...customLimits };
    }

    this.stateHistory.push({
      state: 'ACTIVE',
      timestamp: new Date(),
      reason: 'Risk Governor initialized'
    });
  }

  /**
   * Get current risk state
   */
  getRiskState(): RiskState {
    return this.state;
  }

  /**
   * Get current risk metrics
   */
  getRiskMetrics(): Readonly<RiskMetrics> {
    return {
      systemDrawdown: this.metrics.systemDrawdown,
      systemDailyLoss: this.metrics.systemDailyLoss,
      strategyDrawdowns: new Map(this.metrics.strategyDrawdowns),
      strategyDailyLosses: new Map(this.metrics.strategyDailyLosses),
      assetExposures: new Map(this.metrics.assetExposures)
    };
  }

  /**
   * Approve or deny a trade request
   * 
   * This is the authoritative check. If this returns false, execution MUST NOT occur.
   * No logging-only failures — denials must block execution.
   */
  approveTrade(request: TradeRequest): boolean {
    // Hard fail-safe: SHUTDOWN state blocks all trades
    if (this.state === 'SHUTDOWN') {
      return false;
    }

    // PAUSED state blocks all new trades (existing positions can be closed)
    if (this.state === 'PAUSED') {
      return false;
    }

    // Check system-wide drawdown
    if (this.metrics.systemDrawdown >= this.limits.maxSystemDrawdown) {
      this.transitionToState('SHUTDOWN', `System drawdown limit exceeded: ${this.metrics.systemDrawdown}% >= ${this.limits.maxSystemDrawdown}%`);
      return false;
    }

    // Check system-wide daily loss
    if (this.metrics.systemDailyLoss >= this.limits.maxSystemDailyLoss) {
      this.transitionToState('SHUTDOWN', `System daily loss limit exceeded: $${this.metrics.systemDailyLoss} >= $${this.limits.maxSystemDailyLoss}`);
      return false;
    }

    // Check per-strategy drawdown
    const strategyDrawdown = this.metrics.strategyDrawdowns.get(request.strategy) || 0;
    if (strategyDrawdown >= this.limits.maxStrategyDrawdown) {
      return false; // Strategy-specific block, don't shutdown system
    }

    // Check per-strategy daily loss
    const strategyDailyLoss = this.metrics.strategyDailyLosses.get(request.strategy) || 0;
    if (strategyDailyLoss >= this.limits.maxStrategyDailyLoss) {
      return false; // Strategy-specific block
    }

    // Check per-asset exposure
    const currentExposure = this.metrics.assetExposures.get(request.pair) || 0;
    const newExposure = currentExposure + request.estimatedValue;
    if (newExposure > this.limits.maxAssetExposure) {
      return false; // Asset exposure limit exceeded
    }

    // Check position size limit
    const positionSizePct = (request.estimatedValue / this.currentCapital) * 100;
    if (positionSizePct > this.limits.maxPositionSize) {
      return false; // Position size limit exceeded
    }

    // All checks passed
    return true;
  }

  /**
   * Record a trade execution and update risk metrics
   * 
   * This must be called after every trade execution to maintain accurate risk state.
   */
  recordTradeExecution(result: TradeResult): void {
    if (!result.success) {
      return; // Failed trades don't affect risk metrics
    }

    // Update daily loss tracking (reset at midnight)
    this.checkDailyReset();

    // Update strategy-specific metrics
    const strategyLoss = this.metrics.strategyDailyLosses.get(result.strategy) || 0;
    if (result.pnl !== undefined && result.pnl < 0) {
      this.metrics.strategyDailyLosses.set(result.strategy, strategyLoss + Math.abs(result.pnl));
    }

    // Update system-wide daily loss
    if (result.pnl !== undefined && result.pnl < 0) {
      this.metrics.systemDailyLoss += Math.abs(result.pnl);
    }

    // Update current capital
    if (result.pnl !== undefined) {
      this.currentCapital += result.pnl;
    }

    // Update system drawdown
    const drawdown = ((this.initialCapital - this.currentCapital) / this.initialCapital) * 100;
    this.metrics.systemDrawdown = Math.max(0, drawdown);

    // Update asset exposure
    if (result.executedValue !== undefined) {
      const currentExposure = this.metrics.assetExposures.get(result.pair) || 0;
      // For simplicity, we'll track gross exposure (can be refined in Phase 3)
      this.metrics.assetExposures.set(result.pair, currentExposure + result.executedValue);
    }

    // Check if we need to transition states based on updated metrics
    this.checkRiskLimits();
  }

  /**
   * Manually set risk state (for governance override)
   */
  setState(state: RiskState, reason: string): void {
    this.transitionToState(state, reason);
  }

  /**
   * Transition to a new state
   */
  private transitionToState(newState: RiskState, reason: string): void {
    if (newState === this.state) {
      return; // No change
    }

    const previousState = this.state;
    this.state = newState;
    
    this.stateHistory.push({
      state: newState,
      timestamp: new Date(),
      reason
    });

    console.log(`[RISK_GOVERNOR] State transition: ${previousState} → ${newState} (${reason})`);
    
    // If transitioning to SHUTDOWN, log immutably
    if (newState === 'SHUTDOWN') {
      console.error(`[RISK_GOVERNOR] 🚨 SYSTEM SHUTDOWN ACTIVATED: ${reason}`);
      console.error(`[RISK_GOVERNOR] Metrics at shutdown:`, {
        systemDrawdown: this.metrics.systemDrawdown,
        systemDailyLoss: this.metrics.systemDailyLoss,
        currentCapital: this.currentCapital
      });
    }
  }

  /**
   * Check risk limits and auto-transition if needed
   */
  private checkRiskLimits(): void {
    if (this.state === 'SHUTDOWN') {
      return; // Already shutdown
    }

    // Auto-shutdown if drawdown exceeds limits
    if (this.metrics.systemDrawdown >= this.limits.maxSystemDrawdown) {
      this.transitionToState('SHUTDOWN', `Auto-shutdown: System drawdown ${this.metrics.systemDrawdown}% >= ${this.limits.maxSystemDrawdown}%`);
      return;
    }

    // Auto-shutdown if daily loss exceeds limits
    if (this.metrics.systemDailyLoss >= this.limits.maxSystemDailyLoss) {
      this.transitionToState('SHUTDOWN', `Auto-shutdown: Daily loss $${this.metrics.systemDailyLoss} >= $${this.limits.maxSystemDailyLoss}`);
      return;
    }

    // Transition to PROBATION if approaching limits
    if (this.state === 'ACTIVE') {
      const drawdownThreshold = this.limits.maxSystemDrawdown * 0.8; // 80% of limit
      const dailyLossThreshold = this.limits.maxSystemDailyLoss * 0.8;
      
      if (this.metrics.systemDrawdown >= drawdownThreshold || this.metrics.systemDailyLoss >= dailyLossThreshold) {
        this.transitionToState('PROBATION', `Approaching risk limits (drawdown: ${this.metrics.systemDrawdown}%, daily loss: $${this.metrics.systemDailyLoss})`);
      }
    }
  }

  /**
   * Check if daily reset is needed (reset at midnight)
   */
  private checkDailyReset(): void {
    const now = new Date();
    const lastReset = this.dailyResetTimestamp;
    
    // Reset if it's a new day
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      
      // Reset daily metrics
      this.metrics.systemDailyLoss = 0;
      this.metrics.strategyDailyLosses.clear();
      this.dailyResetTimestamp = now;
      
      console.log('[RISK_GOVERNOR] Daily metrics reset');
    }
  }

  /**
   * Get state history for auditing
   */
  getStateHistory(): ReadonlyArray<{ state: RiskState; timestamp: Date; reason: string }> {
    return [...this.stateHistory];
  }

  /**
   * Update initial capital (for when capital is added/withdrawn)
   */
  updateInitialCapital(newCapital: number): void {
    this.initialCapital = newCapital;
    // Recalculate drawdown
    const drawdown = ((this.initialCapital - this.currentCapital) / this.initialCapital) * 100;
    this.metrics.systemDrawdown = Math.max(0, drawdown);
  }
}

