/**
 * Execution Manager
 * 
 * Centralized trade execution authority.
 * All trade execution must flow through this manager.
 * 
 * PHASE 1: Governance & Survival
 * This manager ensures no trade executes without passing the permission gate.
 */

import { PermissionGate, PermissionResult } from './permission_gate';
import { TradeRequest, TradeResult } from '../src/services/riskGovernor';
import { ModeController } from './mode_controller';
import { RiskGovernor } from '../src/services/riskGovernor';
import { ExchangeAdapter } from './adapters';
import { MarketRegime } from './regime_detector';

/**
 * Execution Mode
 * 
 * PHASE 8: Execution mode determines whether trades are simulated or real.
 * PHASE 9: SHADOW mode observes real market outcomes without affecting capital.
 * VALIDATION: SENTINEL mode uses real adapters with hard-capped capital for infrastructure testing.
 */
export type ExecutionMode = 'SIMULATION' | 'REAL' | 'SHADOW' | 'SENTINEL';

export interface ExecutionConfig {
  modeController: ModeController;
  riskGovernor: RiskGovernor;
  permissionGate: PermissionGate;
  exchangeClient?: ExchangeAdapter; // PHASE 1: Exchange adapter (from core/adapters only)
  executionMode?: ExecutionMode; // PHASE 8: Execution mode (default: REAL)
  shadowTracker?: any; // PHASE 9: Shadow execution tracker (optional)
  regimeGate?: any; // PHASE 10: Regime gate for regime information (optional)
  confidenceGate?: any; // VALIDATION: Confidence gate for REAL execution blocking (optional)
  runtimeTracker?: any; // VALIDATION: Runtime tracker for active trading days (optional)
  sentinelCapitalCap?: number; // VALIDATION: Hard cap for SENTINEL mode (default: 100)
}

/**
 * Execution Manager
 * 
 * Single point of execution that enforces governance.
 * All execution paths must call this manager.
 */
export class ExecutionManager {
  private modeController: ModeController;
  private riskGovernor: RiskGovernor;
  private permissionGate: PermissionGate;
  private exchangeClient?: any;
  private executionMode: ExecutionMode;
  private shadowTracker?: any; // PHASE 9: Shadow execution tracker
  private regimeGate?: any; // PHASE 10: Regime gate for regime information
  private confidenceGate?: any; // VALIDATION: Confidence gate for REAL execution blocking
  private runtimeTracker?: any; // VALIDATION: Runtime tracker for active trading days
  private sentinelCapitalCap: number; // VALIDATION: Hard cap for SENTINEL mode
  private executionHistory: Array<{ request: TradeRequest; result: PermissionResult | TradeResult; timestamp: Date; executionType?: 'SIMULATED' | 'REAL' | 'SHADOW' | 'SENTINEL' }> = [];

  constructor(config: ExecutionConfig) {
    this.modeController = config.modeController;
    this.riskGovernor = config.riskGovernor;
    this.permissionGate = config.permissionGate;
    this.exchangeClient = config.exchangeClient;
    this.executionMode = config.executionMode || 'REAL';
    this.shadowTracker = config.shadowTracker;
    this.regimeGate = config.regimeGate; // PHASE 10: Store regime gate
    this.confidenceGate = config.confidenceGate; // VALIDATION: Store confidence gate
    this.runtimeTracker = config.runtimeTracker; // VALIDATION: Store runtime tracker
    this.sentinelCapitalCap = config.sentinelCapitalCap || 100; // VALIDATION: Default $100 cap
  }

  /**
   * Execute a trade request
   * 
   * This is the ONLY way trades should be executed.
   * 
   * Flow:
   * 1. Check permission gate (MANDATORY - cannot be bypassed)
   * 2. If approved, execute trade
   * 3. Record execution result in Risk Governor (MANDATORY)
   * 4. Return result
   * 
   * @param request Trade request to execute
   * @returns Trade result
   */
  async executeTrade(request: TradeRequest): Promise<TradeResult> {
    const timestamp = new Date();

    // Step 1: Check permission gate (MANDATORY - NO BYPASS ALLOWED)
    const permission = this.permissionGate.checkPermission(request);
    
    if (!permission.allowed) {
      // Permission denied - log and return failure
      // CRITICAL: Execution MUST NOT proceed if permission is denied
      const result: TradeResult = {
        success: false,
        pair: request.pair,
        strategy: request.strategy,
        timestamp,
        pnl: 0
      };

      this.executionHistory.push({ request, result: permission, timestamp });
      
      console.warn(`[EXECUTION_MANAGER] Trade execution denied: ${permission.reason} (source: ${permission.source})`);
      
      // CRITICAL FAIL-SAFE: Double-check mode and risk state
      if (this.modeController.getMode() === 'OBSERVE_ONLY') {
        console.error(`[EXECUTION_MANAGER] 🚨 CRITICAL: Attempted trade execution in OBSERVE_ONLY mode - BLOCKED`);
      }
      if (this.riskGovernor.getRiskState() === 'SHUTDOWN') {
        console.error(`[EXECUTION_MANAGER] 🚨 CRITICAL: Attempted trade execution in SHUTDOWN state - BLOCKED`);
      }
      
      return result;
    }

    // Step 2: Execute trade
    // PHASE 8: Route to simulated or real execution based on execution mode
    // PHASE 9: SHADOW mode uses simulated execution but tracks observed outcomes
    // VALIDATION: SENTINEL mode uses real adapters with hard-capped capital
    let executionResult: TradeResult;
    const executionType: 'SIMULATED' | 'REAL' | 'SHADOW' | 'SENTINEL' = 
      this.executionMode === 'SHADOW' ? 'SHADOW' :
      this.executionMode === 'SIMULATION' ? 'SIMULATED' :
      this.executionMode === 'SENTINEL' ? 'SENTINEL' : 'REAL';
    
    // VALIDATION: Check confidence gate before REAL execution
    if (this.executionMode === 'REAL' && this.confidenceGate) {
      try {
        this.confidenceGate.enforceRealExecutionAllowed();
      } catch (error: any) {
        // Hard block - throw error
        console.error('[EXECUTION_MANAGER] 🚨 CONFIDENCE GATE BLOCKED REAL EXECUTION');
        throw error;
      }
    }

    // VALIDATION: Record trade execution for runtime tracking (all modes except REAL during validation)
    if (this.runtimeTracker && this.executionMode !== 'REAL') {
      this.runtimeTracker.recordTradeExecution(timestamp);
    }
    
    if (this.executionMode === 'SHADOW') {
      // PHASE 9: Shadow execution - simulate but track observed outcomes
      if (!this.exchangeClient) {
        throw new Error('[EXECUTION_MANAGER] Shadow mode requires exchangeClient (SimulatedExecutionAdapter)');
      }
      if (!this.shadowTracker) {
        throw new Error('[EXECUTION_MANAGER] Shadow mode requires shadowTracker');
      }
      try {
        executionResult = await this.executeOnExchange(request);
        (executionResult as any).executionType = 'SHADOW';
        
        // PHASE 10: Get regime information for confidence accumulation
        let regime: MarketRegime | undefined;
        let regimeConfidence: number | undefined;
        if (this.regimeGate) {
          const regimeResult = this.regimeGate.getCurrentRegime(request.pair);
          if (regimeResult) {
            regime = regimeResult.regime;
            regimeConfidence = regimeResult.confidence;
          }
        }
        
        // Start shadow tracking (non-blocking) with regime information
        this.shadowTracker.trackShadowExecution(request, executionResult, timestamp, regime, regimeConfidence)
          .catch((error: any) => {
            console.error(`[EXECUTION_MANAGER] Shadow tracking failed:`, error);
          });
      } catch (error: any) {
        executionResult = {
          success: false,
          pair: request.pair,
          strategy: request.strategy,
          timestamp,
          pnl: 0
        };
        (executionResult as any).executionType = 'SHADOW';
        console.error(`[EXECUTION_MANAGER] Shadow execution failed:`, error);
      }
    } else if (this.executionMode === 'SIMULATION') {
      // PHASE 8: Simulated execution - uses simulated adapter
      if (!this.exchangeClient) {
        throw new Error('[EXECUTION_MANAGER] Simulation mode requires exchangeClient (SimulatedExecutionAdapter)');
      }
      try {
        executionResult = await this.executeOnExchange(request);
        // Add execution type metadata
        (executionResult as any).executionType = 'SIMULATED';
      } catch (error: any) {
        executionResult = {
          success: false,
          pair: request.pair,
          strategy: request.strategy,
          timestamp,
          pnl: 0
        };
        (executionResult as any).executionType = 'SIMULATED';
        console.error(`[EXECUTION_MANAGER] Simulated execution failed:`, error);
      }
    } else if (this.executionMode === 'SENTINEL') {
      // VALIDATION: Sentinel execution - uses REAL adapters but with hard-capped capital
      if (!this.exchangeClient) {
        throw new Error('[EXECUTION_MANAGER] Sentinel mode requires exchangeClient (real adapter)');
      }

      // VALIDATION: Check capital cap before execution
      const currentCapital = this.riskGovernor.getCurrentCapital();
      if (currentCapital > this.sentinelCapitalCap) {
        throw new Error(
          `[EXECUTION_MANAGER] Sentinel capital cap exceeded: ${currentCapital} > ${this.sentinelCapitalCap}. ` +
          `Sentinel mode is for infrastructure testing only with hard-capped capital.`
        );
      }

      try {
        // Execute on real exchange (but with capped capital)
        executionResult = await this.executeOnExchange(request);
        (executionResult as any).executionType = 'SENTINEL';
        
        // VALIDATION: Record runtime for sentinel trades
        if (this.runtimeTracker) {
          this.runtimeTracker.recordTradeExecution(timestamp);
        }
      } catch (error: any) {
        executionResult = {
          success: false,
          pair: request.pair,
          strategy: request.strategy,
          timestamp,
          pnl: 0
        };
        (executionResult as any).executionType = 'SENTINEL';
        console.error(`[EXECUTION_MANAGER] Sentinel execution failed:`, error);
      }
    } else {
      // REAL execution mode
      if (this.exchangeClient) {
        // Real execution through exchange client
        try {
          executionResult = await this.executeOnExchange(request);
          (executionResult as any).executionType = 'REAL';
        } catch (error: any) {
          executionResult = {
            success: false,
            pair: request.pair,
            strategy: request.strategy,
            timestamp,
            pnl: 0
          };
          (executionResult as any).executionType = 'REAL';
          console.error(`[EXECUTION_MANAGER] Exchange execution failed:`, error);
        }
      } else {
        // Fallback: legacy simulated execution (for testing/development)
        executionResult = this.simulateExecution(request);
        (executionResult as any).executionType = 'SIMULATED';
      }
    }

    // Step 3: Record execution in Risk Governor (MANDATORY)
    // This updates risk metrics and may trigger state transitions
    this.riskGovernor.recordTradeExecution(executionResult);

    // Step 4: Log execution with execution type
    this.executionHistory.push({ request, result: executionResult, timestamp, executionType });

    return executionResult;
  }

  /**
   * Execute trade on exchange
   * 
   * PHASE 8: This method handles both real and simulated exchange API calls.
   * Exchange-specific logic goes here.
   * In SIMULATION mode, this calls SimulatedExecutionAdapter which never places real orders.
   */
  private async executeOnExchange(request: TradeRequest): Promise<TradeResult> {
    if (!this.exchangeClient) {
      throw new Error('Exchange client not configured');
    }

    // Build order parameters
    const orderParams = {
      pair: request.pair,
      type: request.action,
      volume: request.amount.toString(),
      price: request.price.toString()
    };

    // Execute order
    // PHASE 8: Works identically for both real and simulated adapters
    let orderResult;
    if (request.action === 'buy') {
      orderResult = await this.exchangeClient.placeBuyOrder(
        request.pair,
        request.amount,
        request.price
      );
    } else {
      orderResult = await this.exchangeClient.placeSellOrder(
        request.pair,
        request.amount,
        request.price
      );
    }

    // Convert exchange result to TradeResult
    // PHASE 8: Result shape is identical for simulated and real execution
    const result: TradeResult = {
      success: orderResult.success || false,
      pair: request.pair,
      strategy: request.strategy,
      timestamp: new Date(),
      executedValue: request.estimatedValue,
      pnl: 0, // Will be updated when position is closed
      orderId: orderResult.orderId,
      executionPrice: orderResult.price || orderResult.averagePrice || request.price,
      quantity: orderResult.quantity || orderResult.filledQuantity || request.amount
    };

    // PHASE 8: Include fees and slippage if available (from simulated adapter)
    if (orderResult.fees !== undefined) {
      (result as any).fees = orderResult.fees;
    }
    if (orderResult.slippage !== undefined) {
      (result as any).slippage = orderResult.slippage;
    }

    return result;
  }

  /**
   * Simulate trade execution (for testing/development)
   * 
   * In OBSERVE_ONLY mode, this simulates execution without deploying capital.
   * IMPORTANT: OBSERVE_ONLY mode should NEVER reach here because permission gate blocks it.
   * This is a fail-safe in case permission gate is bypassed.
   */
  private simulateExecution(request: TradeRequest): TradeResult {
    const mode = this.modeController.getMode();
    
    if (mode === 'OBSERVE_ONLY') {
      // CRITICAL: OBSERVE_ONLY mode should never execute trades
      // This is a fail-safe - if we reach here, permission gate was bypassed
      console.error(`[EXECUTION_MANAGER] ⚠️ CRITICAL: Attempted execution in OBSERVE_ONLY mode - this should be blocked by permission gate!`);
      return {
        success: false,
        pair: request.pair,
        strategy: request.strategy,
        timestamp: new Date(),
        executedValue: 0,
        pnl: 0
      };
    }

    // Simulate execution result (only for AGGRESSIVE mode when no exchange client)
    const result: TradeResult = {
      success: true,
      pair: request.pair,
      strategy: request.strategy,
      timestamp: new Date(),
      executedValue: request.estimatedValue,
      pnl: 0 // Simulated trades have zero PnL initially
    };

    return result;
  }

  /**
   * Get execution history (for auditing)
   * 
   * PHASE 8: Includes executionType metadata for each execution
   */
  getExecutionHistory(): ReadonlyArray<{ request: TradeRequest; result: PermissionResult | TradeResult; timestamp: Date; executionType?: 'SIMULATED' | 'REAL' | 'SHADOW' }> {
    return [...this.executionHistory];
  }

  /**
   * Get current execution mode
   * 
   * PHASE 8: Returns whether execution is simulated or real
   */
  getExecutionMode(): ExecutionMode {
    return this.executionMode;
  }

  /**
   * Check if execution is currently allowed
   * 
   * Fast check for strategies to determine if they should generate signals.
   */
  isExecutionAllowed(): boolean {
    return this.permissionGate.isTradingAllowed();
  }
}

