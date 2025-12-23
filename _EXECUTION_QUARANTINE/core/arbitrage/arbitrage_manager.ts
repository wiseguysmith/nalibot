/**
 * Arbitrage Manager
 * 
 * PHASE 6: Arbitrage Execution Layer
 * 
 * Manages arbitrage strategy execution with full governance integration.
 * Enforces regime & health gating, capital constraints, and observability.
 */

import { BaseArbitrageStrategy } from '../../strategies/arbitrage/base_arbitrage_strategy';
import { ArbitrageSignal, ArbitrageExecutionResult } from './arbitrage_types';
import { ArbitrageExecutor } from './arbitrage_executor';
import { ExecutionManager } from '../execution_manager';
import { RegimeDetector, MarketRegime } from '../regime_detector';
import { CapitalGate } from '../capital/capital_gate';
import { SystemHealthMonitor } from '../health/system_health';
import { EventLog, EventType } from '../observability/event_log';
import { AlertManager } from '../alerts/alert_manager';
import { ModeController } from '../mode_controller';

export interface ArbitrageManagerConfig {
  minRegimeConfidence: number;      // Minimum regime confidence to execute (default: 0.6)
  requireFavorableRegime: boolean;  // Require FAVORABLE regime (default: true)
  maxCapitalPerTrade: number;      // Maximum capital per arbitrage trade
  healthCheckEnabled: boolean;     // Check system health before execution (default: true)
}

/**
 * Arbitrage Manager
 * 
 * Coordinates arbitrage strategy execution with governance.
 */
export class ArbitrageManager {
  private strategies: Map<string, BaseArbitrageStrategy> = new Map();
  private executor: ArbitrageExecutor;
  private regimeDetector: RegimeDetector | null;
  private capitalGate: CapitalGate | null;
  private healthMonitor: SystemHealthMonitor | null;
  private eventLog: EventLog | null;
  private alertManager: AlertManager | null;
  private modeController: ModeController;
  private config: ArbitrageManagerConfig;

  constructor(
    executionManager: ExecutionManager,
    modeController: ModeController,
    regimeDetector: RegimeDetector | null = null,
    capitalGate: CapitalGate | null = null,
    healthMonitor: SystemHealthMonitor | null = null,
    eventLog: EventLog | null = null,
    alertManager: AlertManager | null = null,
    config?: Partial<ArbitrageManagerConfig>
  ) {
    this.executor = new ArbitrageExecutor(executionManager, eventLog, alertManager);
    this.regimeDetector = regimeDetector;
    this.capitalGate = capitalGate;
    this.healthMonitor = healthMonitor;
    this.eventLog = eventLog;
    this.alertManager = alertManager;
    this.modeController = modeController;
    this.config = {
      minRegimeConfidence: 0.6,
      requireFavorableRegime: true,
      maxCapitalPerTrade: 10000,
      healthCheckEnabled: true,
      ...config
    };
  }

  /**
   * Register an arbitrage strategy
   */
  registerStrategy(strategy: BaseArbitrageStrategy): void {
    this.strategies.set(strategy.getStrategyId(), strategy);
    
    if (this.eventLog) {
      this.eventLog.append({
        eventType: EventType.STRATEGY_STATE_CHANGE,
        strategyId: strategy.getStrategyId(),
        reason: 'Arbitrage strategy registered',
        metadata: {
          arbitrageType: strategy.getArbitrageType(),
          metadata: strategy.getMetadata()
        }
      } as any);
    }
  }

  /**
   * Check if arbitrage can execute
   * 
   * Enforces:
   * - Regime = FAVORABLE (if required)
   * - Regime confidence ≥ threshold
   * - System health = OK
   * - No active SAFE MODE
   * - Capital pool drawdown < limit
   */
  private canExecuteArbitrage(signal: ArbitrageSignal): { allowed: boolean; reason: string } {
    // Check system mode
    if (this.modeController.getMode() === 'OBSERVE_ONLY') {
      return { allowed: false, reason: 'System in OBSERVE_ONLY mode' };
    }

    // Check regime
    if (this.regimeDetector && this.config.requireFavorableRegime) {
      const regimeResult = this.regimeDetector.getCurrentRegime();
      
      if (regimeResult.regime !== MarketRegime.FAVORABLE) {
        return { allowed: false, reason: `Regime is ${regimeResult.regime}, requires FAVORABLE` };
      }

      if (regimeResult.confidence < this.config.minRegimeConfidence) {
        return { allowed: false, reason: `Regime confidence ${regimeResult.confidence.toFixed(2)} < ${this.config.minRegimeConfidence}` };
      }
    }

    // Check system health
    if (this.config.healthCheckEnabled && this.healthMonitor) {
      const health = this.healthMonitor.getSystemHealth();
      if (!health.healthy) {
        return { allowed: false, reason: 'System health check failed' };
      }
    }

    // Check capital constraints
    if (this.capitalGate) {
      const totalTradeValue = signal.legs.reduce((sum, leg) => 
        sum + leg.size * leg.expectedPrice, 0
      );

      if (totalTradeValue > this.config.maxCapitalPerTrade) {
        return { allowed: false, reason: `Trade value ${totalTradeValue} exceeds max ${this.config.maxCapitalPerTrade}` };
      }

      // Check capital gate for each leg (will be checked again in executor)
      const capitalCheck = this.capitalGate.checkCapital(signal.strategyId, totalTradeValue);
      if (!capitalCheck.allowed) {
        return { allowed: false, reason: capitalCheck.reason || 'Insufficient capital' };
      }
    }

    return { allowed: true, reason: 'All checks passed' };
  }

  /**
   * Process arbitrage signal
   * 
   * Checks eligibility and executes if allowed.
   * Returns null if signal is ignored (not an error).
   */
  async processSignal(signal: ArbitrageSignal): Promise<ArbitrageExecutionResult | null> {
    // Check eligibility
    const eligibility = this.canExecuteArbitrage(signal);
    
    if (!eligibility.allowed) {
      // Signal ignored - log but don't treat as error
      if (this.eventLog) {
        this.eventLog.append({
          eventType: EventType.TRADE_BLOCKED,
          strategyId: signal.strategyId,
          reason: `Arbitrage signal ignored: ${eligibility.reason}`,
          metadata: {
            arbitrageType: signal.arbitrageType,
            symbol: signal.symbol,
            edgePercent: signal.edgePercent,
            blockingReason: eligibility.reason
          }
        } as any);
      }

      // Silence is success - no alert for normal blocking
      return null;
    }

    // Execute arbitrage
    return await this.executor.executeArbitrage(signal);
  }

  /**
   * Run arbitrage strategies
   * 
   * Polls all registered strategies for signals and executes if eligible.
   */
  async runStrategies(marketData: Map<string, any>): Promise<ArbitrageExecutionResult[]> {
    const results: ArbitrageExecutionResult[] = [];

    for (const [strategyId, strategy] of this.strategies) {
      try {
        // Generate signal
        const signal = await strategy.generateSignal(marketData.get(strategyId) || {}, new Map());

        if (!signal) {
          continue; // No signal generated
        }

        // Process signal
        const result = await this.processSignal(signal);
        if (result) {
          results.push(result);
        }
      } catch (error: any) {
        console.error(`[ARBITRAGE] Error in strategy ${strategyId}:`, error);
        
        if (this.eventLog) {
          this.eventLog.append({
            eventType: EventType.TRADE_BLOCKED,
            strategyId,
            reason: `Strategy error: ${error.message}`,
            metadata: { error: error.message }
          } as any);
        }
      }
    }

    return results;
  }

  /**
   * Get registered strategies
   */
  getStrategies(): ReadonlyArray<BaseArbitrageStrategy> {
    return Array.from(this.strategies.values());
  }
}

