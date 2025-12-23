/**
 * Arbitrage Executor
 * 
 * PHASE 6: Arbitrage Execution Layer
 * 
 * Translates arbitrage signals into paired TradeRequests.
 * Submits requests to ExecutionManager (full governance).
 * Enforces atomic intent (both legs or none).
 * 
 * Rules:
 * - Each leg goes through full governance
 * - No direct adapter calls
 * - Partial execution must be detected and neutralized
 */

import { ArbitrageSignal, ArbitrageExecutionResult, LegExecutionResult, ArbitrageExecutionConfig } from './arbitrage_types';
import { TradeRequest, TradeResult } from '../../src/services/riskGovernor';
import { ExecutionManager } from '../execution_manager';
import { EventLog, EventType } from '../observability/event_log';
import { AlertManager, AlertSeverity } from '../alerts/alert_manager';

/**
 * Arbitrage Executor
 * 
 * Executes arbitrage strategies through full governance stack.
 */
export class ArbitrageExecutor {
  private executionManager: ExecutionManager;
  private eventLog: EventLog | null;
  private alertManager: AlertManager | null;
  private config: ArbitrageExecutionConfig;

  constructor(
    executionManager: ExecutionManager,
    eventLog: EventLog | null = null,
    alertManager: AlertManager | null = null,
    config?: Partial<ArbitrageExecutionConfig>
  ) {
    this.executionManager = executionManager;
    this.eventLog = eventLog;
    this.alertManager = alertManager;
    this.config = {
      maxSlippagePercent: 0.1,        // 0.1% max slippage
      maxExecutionDelayMs: 5000,      // 5 seconds max delay
      minEdgePercent: 0.1,             // 0.1% minimum edge
      requireAtomicExecution: true,    // Require both legs
      neutralizationEnabled: true,     // Auto-neutralize on partial
      ...config
    };
  }

  /**
   * Execute arbitrage signal
   * 
   * Each leg goes through full governance:
   * CapitalGate → RegimeGate → PermissionGate → RiskGovernor → ExecutionManager
   */
  async executeArbitrage(signal: ArbitrageSignal): Promise<ArbitrageExecutionResult> {
    const startTime = Date.now();
    const legResults: LegExecutionResult[] = [];
    let totalProfit = 0;
    let totalFees = 0;
    let totalSlippage = 0;
    let requiresNeutralization = false;

    // Log arbitrage attempt
    if (this.eventLog) {
      this.eventLog.append({
        eventType: EventType.SIGNAL_GENERATED,
        strategyId: signal.strategyId,
        reason: `Arbitrage signal generated: ${signal.arbitrageType}`,
        metadata: {
          arbitrageType: signal.arbitrageType,
          symbol: signal.symbol,
          edgeSize: signal.edgeSize,
          edgePercent: signal.edgePercent,
          confidence: signal.confidence,
          legs: signal.legs.length
        }
      } as any);
    }

    // Execute legs in priority order
    for (const leg of signal.legs.sort((a, b) => a.priority - b.priority)) {
      const legStartTime = Date.now();

      // Convert leg to TradeRequest
      const tradeRequest: TradeRequest = {
        strategy: signal.strategyId,
        pair: leg.symbol,
        action: leg.side,
        amount: leg.size,
        price: leg.expectedPrice,
        estimatedValue: leg.size * leg.expectedPrice
      };

      // Execute through full governance stack
      const result: TradeResult = await this.executionManager.executeTrade(tradeRequest);

      // Record leg result
      const legExecutionTime = Date.now() - legStartTime;
      const legSlippage = result.success && result.executedPrice
        ? Math.abs(result.executedPrice - leg.expectedPrice) / leg.expectedPrice * 100
        : 0;

      const legResult: LegExecutionResult = {
        legId: leg.legId,
        success: result.success,
        orderId: result.orderId,
        executedPrice: result.executedPrice || leg.expectedPrice,
        executedSize: result.executedSize || 0,
        fees: result.fees || 0,
        slippage: legSlippage,
        executionTimeMs: legExecutionTime,
        failureReason: result.error
      };

      legResults.push(legResult);

      // Check for failures
      if (!result.success) {
        // Leg failed - check if we need to neutralize
        if (legResults.some(r => r.success)) {
          // Partial execution occurred
          requiresNeutralization = true;
          
          if (this.eventLog) {
            this.eventLog.append({
              eventType: EventType.TRADE_BLOCKED,
              strategyId: signal.strategyId,
              reason: `Arbitrage leg failed: ${leg.legId} - ${result.error}`,
              metadata: {
                arbitrageType: signal.arbitrageType,
                legId: leg.legId,
                partialExecution: true
              }
            } as any);
          }

          if (this.alertManager) {
            this.alertManager.alert(
              AlertSeverity.CRITICAL,
              'Arbitrage Partial Execution',
              `Arbitrage leg failed: ${leg.legId}`,
              result.error || 'Unknown error',
              'Neutralize exposure immediately',
              { signal, legResult }
            );
          }
        }

        // If atomic execution required and first leg failed, stop
        if (this.config.requireAtomicExecution && leg.priority === 1) {
          break;
        }
      } else {
        // Leg succeeded
        totalFees += legResult.fees;
        totalSlippage += legResult.slippage;

        // Check slippage threshold
        if (legSlippage > this.config.maxSlippagePercent) {
          requiresNeutralization = true;
          
          if (this.alertManager) {
            this.alertManager.alert(
              AlertSeverity.CRITICAL,
              'Arbitrage Slippage Exceeded',
              `Slippage ${legSlippage.toFixed(2)}% exceeds threshold ${this.config.maxSlippagePercent}%`,
              'Slippage too high',
              'Neutralize exposure immediately',
              { signal, legResult }
            );
          }
        }

        // Check execution delay
        if (legExecutionTime > this.config.maxExecutionDelayMs) {
          requiresNeutralization = true;
          
          if (this.alertManager) {
            this.alertManager.alert(
              AlertSeverity.CRITICAL,
              'Arbitrage Execution Delay',
              `Execution delay ${legExecutionTime}ms exceeds threshold ${this.config.maxExecutionDelayMs}ms`,
              'Execution too slow',
              'Neutralize exposure immediately',
              { signal, legResult }
            );
          }
        }
      }
    }

    // Calculate total profit
    const legsExecuted = legResults.filter(r => r.success).length;
    const legsTotal = signal.legs.length;

    if (legsExecuted === legsTotal) {
      // Both legs executed - calculate profit
      totalProfit = signal.edgeSize - totalFees - (totalSlippage * signal.legs[0].expectedPrice / 100);
    } else {
      // Partial execution - profit is negative (loss)
      totalProfit = -totalFees - (totalSlippage * signal.legs[0].expectedPrice / 100);
    }

    const executionTime = Date.now() - startTime;
    const success = legsExecuted === legsTotal && !requiresNeutralization;

    const executionResult: ArbitrageExecutionResult = {
      success,
      strategyId: signal.strategyId,
      arbitrageType: signal.arbitrageType,
      symbol: signal.symbol,
      legsExecuted,
      legsTotal,
      legResults,
      totalProfit,
      totalFees,
      totalSlippage,
      executionTimeMs: executionTime,
      timestamp: new Date(),
      failureReason: success ? undefined : 'Partial execution or threshold exceeded',
      requiresNeutralization
    };

    // Log result
    if (this.eventLog) {
      this.eventLog.append({
        eventType: success ? EventType.TRADE_EXECUTED : EventType.TRADE_BLOCKED,
        strategyId: signal.strategyId,
        reason: success 
          ? `Arbitrage completed: ${signal.arbitrageType}`
          : `Arbitrage aborted: ${executionResult.failureReason}`,
        metadata: {
          arbitrageType: signal.arbitrageType,
          success,
          legsExecuted,
          legsTotal,
          totalProfit,
          totalFees,
          totalSlippage,
          requiresNeutralization
        }
      } as any);
    }

    // Handle neutralization if needed
    if (requiresNeutralization && this.config.neutralizationEnabled) {
      await this.neutralizeExposure(signal, legResults);
    }

    return executionResult;
  }

  /**
   * Neutralize exposure from partial execution
   * 
   * Flattens any open positions from failed arbitrage.
   */
  private async neutralizeExposure(
    signal: ArbitrageSignal,
    legResults: LegExecutionResult[]
  ): Promise<void> {
    console.error(`[ARBITRAGE] 🚨 Neutralizing exposure from partial execution`);

    // Find executed legs
    const executedLegs = signal.legs.filter((leg, index) => 
      legResults[index]?.success
    );

    // Create opposite trades to neutralize
    for (const leg of executedLegs) {
      const oppositeSide = leg.side === 'buy' ? 'sell' : 'buy';
      
      const neutralizeRequest: TradeRequest = {
        strategy: signal.strategyId,
        pair: leg.symbol,
        action: oppositeSide,
        amount: legResults.find(r => r.legId === leg.legId)?.executedSize || leg.size,
        price: legResults.find(r => r.legId === leg.legId)?.executedPrice || leg.expectedPrice,
        estimatedValue: leg.size * leg.expectedPrice
      };

      // Execute neutralization through governance
      const result = await this.executionManager.executeTrade(neutralizeRequest);

      if (this.eventLog) {
        this.eventLog.append({
          eventType: result.success ? EventType.TRADE_EXECUTED : EventType.TRADE_BLOCKED,
          strategyId: signal.strategyId,
          reason: `Neutralization ${result.success ? 'succeeded' : 'failed'}: ${leg.legId}`,
          metadata: {
            arbitrageType: signal.arbitrageType,
            neutralization: true,
            legId: leg.legId
          }
        } as any);
      }

      if (!result.success) {
        console.error(`[ARBITRAGE] 🚨 CRITICAL: Neutralization failed for ${leg.legId}`);
        
        if (this.alertManager) {
          this.alertManager.alert(
            AlertSeverity.CRITICAL,
            'Arbitrage Neutralization Failed',
            `Failed to neutralize exposure: ${leg.legId}`,
            result.error || 'Unknown error',
            'Manual intervention required',
            { signal, leg }
          );
        }
      }
    }
  }
}

