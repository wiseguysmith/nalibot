/**
 * Account Abstraction
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * First-class account abstraction with:
 * - Isolated capital pools
 * - Account-scoped risk rules
 * - Strategy permissions (explicit opt-in)
 * - Account lifecycle states
 * - Account-scoped observability
 */

import { CapitalPool, CapitalPoolType, CapitalPoolMetrics } from '../capital/capital_pool';
import { RiskGovernor, RiskState } from '../../src/services/riskGovernor';
import { StrategyState } from '../strategy_metadata';
import { AccountRiskBudget, AccountRiskBudgetConfig } from '../risk_budget/account_risk_budget';
import { StrategyRiskAllocator } from '../risk_budget/strategy_risk_allocator';

export type AccountState = 'ACTIVE' | 'PROBATION' | 'OBSERVE_ONLY' | 'SHUTDOWN';

export interface AccountRiskRules {
  maxDrawdown: number; // Maximum allowed drawdown percentage
  killSwitchThreshold: number; // Drawdown threshold for auto-shutdown
  probationThreshold: number; // Drawdown threshold for probation
  maxDailyLoss: number; // Maximum daily loss in USD
  maxPositionSize: number; // Maximum position size percentage
}

export interface AccountConfig {
  accountId: string;
  displayName: string;
  entityId?: string; // Optional entity ownership
  startingCapital: number;
  directionalCapital?: number; // Override default split
  arbitrageCapital?: number; // Override default split
  riskRules?: Partial<AccountRiskRules>;
  enabledStrategies?: string[]; // Explicit opt-in (default: empty)
  riskBudgetConfig?: AccountRiskBudgetConfig; // PHASE 8: Risk budget configuration
  enableRiskBudget?: boolean; // PHASE 8: Enable risk budgeting (default: false)
}

/**
 * Account
 * 
 * Each account owns:
 * - Capital pools (Directional / Arbitrage)
 * - Risk Governor (account-scoped)
 * - Strategy permissions
 * - Account state
 * - Observability data
 */
export class Account {
  public readonly accountId: string;
  public readonly displayName: string;
  public readonly entityId?: string;
  public readonly createdAt: Date;

  // Capital
  public readonly directionalPool: CapitalPool;
  public readonly arbitragePool: CapitalPool;
  private startingCapital: number;
  private currentEquity: number;

  // Risk
  public readonly riskGovernor: RiskGovernor;
  public readonly riskRules: AccountRiskRules;

  // PHASE 8: Risk Budget
  public readonly riskBudget: AccountRiskBudget | null;
  public readonly strategyRiskAllocator: StrategyRiskAllocator | null;

  // Strategy Permissions
  private enabledStrategies: Set<string> = new Set(); // Explicit opt-in only

  // State
  private state: AccountState = 'ACTIVE';
  private stateHistory: Array<{ state: AccountState; timestamp: Date; reason: string }> = [];

  // Observability (will be populated by AccountManager)
  public pnl: number = 0;
  public drawdown: number = 0;
  public tradeHistory: any[] = [];

  constructor(config: AccountConfig) {
    this.accountId = config.accountId;
    this.displayName = config.displayName;
    this.entityId = config.entityId;
    this.createdAt = new Date();
    this.startingCapital = config.startingCapital;
    this.currentEquity = config.startingCapital;

    // Initialize capital pools
    const directionalCapital = config.directionalCapital ?? (config.startingCapital * 0.7);
    const arbitrageCapital = config.arbitrageCapital ?? (config.startingCapital * 0.3);

    this.directionalPool = new CapitalPool(CapitalPoolType.DIRECTIONAL, directionalCapital);
    this.arbitragePool = new CapitalPool(CapitalPoolType.ARBITRAGE, arbitrageCapital);

    // Initialize risk rules
    const defaultRiskRules: AccountRiskRules = {
      maxDrawdown: 25, // 25% default
      killSwitchThreshold: 20, // 20% for shutdown
      probationThreshold: 15, // 15% for probation
      maxDailyLoss: 1000, // $1000 default
      maxPositionSize: 30 // 30% default
    };
    this.riskRules = { ...defaultRiskRules, ...config.riskRules };

    // Initialize account-scoped Risk Governor
    this.riskGovernor = new RiskGovernor(config.startingCapital, {
      maxSystemDrawdown: this.riskRules.maxDrawdown,
      maxSystemDailyLoss: this.riskRules.maxDailyLoss,
      maxPositionSize: this.riskRules.maxPositionSize
    });

    // Initialize strategy permissions (explicit opt-in)
    if (config.enabledStrategies) {
      config.enabledStrategies.forEach(strategyId => {
        this.enabledStrategies.add(strategyId);
      });
    }

    // PHASE 8: Initialize risk budget (if enabled)
    if (config.enableRiskBudget && config.riskBudgetConfig) {
      this.riskBudget = new AccountRiskBudget(config.riskBudgetConfig);
      this.strategyRiskAllocator = new StrategyRiskAllocator(this.riskBudget);
    } else {
      this.riskBudget = null;
      this.strategyRiskAllocator = null;
    }

    // Record initial state
    this.stateHistory.push({
      state: 'ACTIVE',
      timestamp: new Date(),
      reason: 'Account created'
    });

    console.log(`[ACCOUNT] Created account: ${this.accountId} (${this.displayName}) with capital: $${config.startingCapital}`);
  }

  /**
   * Get account state
   */
  getState(): AccountState {
    return this.state;
  }

  /**
   * Set account state
   */
  setState(newState: AccountState, reason: string): void {
    if (newState === this.state) {
      return;
    }

    const previousState = this.state;
    this.state = newState;

    this.stateHistory.push({
      state: newState,
      timestamp: new Date(),
      reason
    });

    console.log(`[ACCOUNT:${this.accountId}] State transition: ${previousState} → ${newState} (${reason})`);

    // Auto-shutdown if kill switch threshold exceeded
    if (newState === 'ACTIVE' && this.drawdown >= this.riskRules.killSwitchThreshold) {
      this.setState('SHUTDOWN', `Drawdown ${this.drawdown}% exceeded kill switch threshold ${this.riskRules.killSwitchThreshold}%`);
    }

    // Auto-probation if threshold exceeded
    if (newState === 'ACTIVE' && this.drawdown >= this.riskRules.probationThreshold && this.drawdown < this.riskRules.killSwitchThreshold) {
      this.setState('PROBATION', `Drawdown ${this.drawdown}% exceeded probation threshold ${this.riskRules.probationThreshold}%`);
    }
  }

  /**
   * Get state history
   */
  getStateHistory(): ReadonlyArray<{ state: AccountState; timestamp: Date; reason: string }> {
    return [...this.stateHistory];
  }

  /**
   * Check if strategy is enabled for this account
   */
  isStrategyEnabled(strategyId: string): boolean {
    return this.enabledStrategies.has(strategyId);
  }

  /**
   * Enable a strategy for this account
   */
  enableStrategy(strategyId: string): void {
    if (!this.enabledStrategies.has(strategyId)) {
      this.enabledStrategies.add(strategyId);
      console.log(`[ACCOUNT:${this.accountId}] Enabled strategy: ${strategyId}`);
    }
  }

  /**
   * Disable a strategy for this account
   */
  disableStrategy(strategyId: string): void {
    if (this.enabledStrategies.has(strategyId)) {
      this.enabledStrategies.delete(strategyId);
      console.log(`[ACCOUNT:${this.accountId}] Disabled strategy: ${strategyId}`);
    }
  }

  /**
   * Get enabled strategies
   */
  getEnabledStrategies(): string[] {
    return Array.from(this.enabledStrategies);
  }

  /**
   * Get capital metrics
   */
  getCapitalMetrics(): {
    startingCapital: number;
    currentEquity: number;
    directionalPool: CapitalPoolMetrics;
    arbitragePool: CapitalPoolMetrics;
  } {
    return {
      startingCapital: this.startingCapital,
      currentEquity: this.currentEquity,
      directionalPool: this.directionalPool.getMetrics(),
      arbitragePool: this.arbitragePool.getMetrics()
    };
  }

  /**
   * Update equity based on P&L
   */
  updateEquity(pnl: number): void {
    const previousDrawdown = this.drawdown;
    this.currentEquity += pnl;
    this.pnl += pnl;

    // Update drawdown
    const peakEquity = Math.max(this.startingCapital, this.currentEquity);
    this.drawdown = peakEquity > 0 ? ((peakEquity - this.currentEquity) / peakEquity) * 100 : 0;

    // PHASE 8: Apply risk budget decay on drawdown increase
    if (this.riskBudget && this.drawdown > previousDrawdown) {
      const drawdownIncrease = this.drawdown - previousDrawdown;
      if (drawdownIncrease > 0) {
        this.riskBudget.applyDrawdownPenalty(drawdownIncrease);
      }
    }

    // Check state transitions based on drawdown
    if (this.state === 'ACTIVE' && this.drawdown >= this.riskRules.killSwitchThreshold) {
      this.setState('SHUTDOWN', `Drawdown ${this.drawdown}% exceeded kill switch threshold`);
    } else if (this.state === 'ACTIVE' && this.drawdown >= this.riskRules.probationThreshold) {
      this.setState('PROBATION', `Drawdown ${this.drawdown}% exceeded probation threshold`);
    }
  }

  /**
   * PHASE 8: Apply regime scaling to risk budget
   */
  applyRegimeScaling(regime: 'FAVORABLE' | 'UNFAVORABLE' | 'UNKNOWN', confidence: number): void {
    if (this.riskBudget) {
      this.riskBudget.applyRegimeScaling(regime, confidence);
    }
  }

  /**
   * PHASE 8: Apply recovery to risk budget
   */
  applyRiskRecovery(daysSinceDrawdown: number, regime: 'FAVORABLE' | 'UNFAVORABLE' | 'UNKNOWN'): void {
    if (this.riskBudget) {
      this.riskBudget.applyRecovery(daysSinceDrawdown, regime);
    }
  }

  /**
   * Check if account can trade
   */
  canTrade(): boolean {
    return this.state === 'ACTIVE' && this.riskGovernor.getRiskState() !== 'SHUTDOWN';
  }

  /**
   * Get account summary
   */
  getSummary(): {
    accountId: string;
    displayName: string;
    state: AccountState;
    equity: number;
    pnl: number;
    drawdown: number;
    enabledStrategies: string[];
    capitalMetrics: ReturnType<Account['getCapitalMetrics']>;
  } {
    return {
      accountId: this.accountId,
      displayName: this.displayName,
      state: this.state,
      equity: this.currentEquity,
      pnl: this.pnl,
      drawdown: this.drawdown,
      enabledStrategies: this.getEnabledStrategies(),
      capitalMetrics: this.getCapitalMetrics()
    };
  }
}

