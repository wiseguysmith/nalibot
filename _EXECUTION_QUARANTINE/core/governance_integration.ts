/**
 * Governance Integration
 * 
 * Adapter layer to integrate Phase 1 governance into existing trading engines.
 * 
 * PHASE 1: Governance & Survival
 * PHASE 2: Regime-Aware Strategy Governance
 * PHASE 3: Capital Intelligence & Governance
 * 
 * This module provides integration helpers for existing code.
 */

import { ModeController, SystemMode } from './mode_controller';
import { RiskGovernor, RiskState } from '../src/services/riskGovernor';
import { PermissionGate } from './permission_gate';
import { ExecutionManager, ExecutionMode } from './execution_manager';
import { TradeRequest, TradeResult } from '../src/services/riskGovernor';
import { RegimeDetector, MarketRegime } from './regime_detector';
import { StrategyMetadataRegistry, registerDefaultStrategies } from './strategy_metadata';
import { RegimeGate } from './regime_gate';
import { CapitalPool, CapitalPoolType } from './capital/capital_pool';
import { StrategyCapitalAccountManager } from './capital/strategy_capital_account';
import { CapitalAllocator } from './capital/capital_allocator';
import { CapitalGate } from './capital/capital_gate';
import { EventLog } from './observability/event_log';
import { ObservabilityHooks } from './observability/observability_integration';
import { DailySnapshotGenerator } from './observability/daily_snapshot';
import { AttributionEngine } from './observability/attribution_engine';
import { ReplayEngine } from './replay/replay_engine';
import { SystemHealthMonitor } from './health/system_health';
import { HeartbeatMonitor } from './health/heartbeat';
import { FailSafeManager } from './health/failsafe';
import { StartupChecks } from './health/startup_checks';
import { DataIntegrityVerifier } from './health/data_integrity';
import { AlertManager } from './alerts/alert_manager';
import { AccountManager, AccountSignalRouter } from './accounts';

/**
 * Governance System
 * 
 * Centralized governance infrastructure.
 * Initialize this once and use throughout the application.
 * 
 * PHASE 1: Governance & Survival
 * PHASE 2: Regime-Aware Strategy Governance
 * PHASE 3: Capital Intelligence & Governance
 * PHASE 4: Observability, Attribution & Replay
 */
export class GovernanceSystem {
  public readonly modeController: ModeController;
  public readonly riskGovernor: RiskGovernor;
  public readonly permissionGate: PermissionGate;
  public readonly executionManager: ExecutionManager;
  
  // PHASE 2: Regime-aware governance
  public readonly regimeDetector: RegimeDetector | null;
  public readonly strategyRegistry: StrategyMetadataRegistry | null;
  public readonly regimeGate: RegimeGate | null;
  
  // PHASE 3: Capital intelligence
  public readonly directionalPool: CapitalPool | null;
  public readonly arbitragePool: CapitalPool | null;
  public readonly accountManager: StrategyCapitalAccountManager | null;
  public readonly capitalAllocator: CapitalAllocator | null;
  public readonly capitalGate: CapitalGate | null;
  
  // PHASE 4: Observability
  public readonly eventLog: EventLog | null;
  public readonly observabilityHooks: ObservabilityHooks | null;
  public readonly snapshotGenerator: DailySnapshotGenerator | null;
  public readonly attributionEngine: AttributionEngine | null;
  
  // PHASE 5: Production Hardening
  public readonly healthMonitor: SystemHealthMonitor;
  public readonly heartbeatMonitor: HeartbeatMonitor | null;
  public readonly failSafeManager: FailSafeManager | null;
  public readonly startupChecks: StartupChecks;
  public readonly dataIntegrityVerifier: DataIntegrityVerifier;
  public readonly alertManager: AlertManager;

  // PHASE 7: Account & Entity Abstraction
  public readonly phase7AccountManager: AccountManager | null;
  public readonly accountSignalRouter: AccountSignalRouter | null;

  constructor(config?: {
    initialMode?: SystemMode;
    initialCapital?: number;
    exchangeClient?: any;
    enableRegimeGovernance?: boolean; // PHASE 2: Enable regime checks
    enableCapitalGovernance?: boolean; // PHASE 3: Enable capital checks
    directionalCapital?: number; // PHASE 3: Initial directional pool capital
    arbitrageCapital?: number; // PHASE 3: Initial arbitrage pool capital
    enableObservability?: boolean; // PHASE 4: Enable observability (default: true)
    enableProductionHardening?: boolean; // PHASE 5: Enable production hardening (default: true)
    enableAccountAbstraction?: boolean; // PHASE 7: Enable account abstraction (default: false)
    phase7AccountManager?: AccountManager; // PHASE 7: Optional account manager
    executionMode?: ExecutionMode; // PHASE 8: Execution mode (SIMULATION | REAL | SHADOW, default: REAL)
    shadowTracker?: any; // PHASE 9: Shadow execution tracker (required for SHADOW mode)
  }) {
    // Initialize Mode Controller
    this.modeController = new ModeController(config?.initialMode || 'OBSERVE_ONLY');

    // Initialize Risk Governor
    this.riskGovernor = new RiskGovernor(config?.initialCapital || 1000);

    // Initialize Permission Gate
    this.permissionGate = new PermissionGate(this.modeController, this.riskGovernor);

    // Initialize Execution Manager
    // PHASE 8: Support execution mode (SIMULATION | REAL)
    // PHASE 9: Support SHADOW mode with shadow tracker
    // PHASE 10: Pass regime gate for regime information in shadow mode
    this.executionManager = new ExecutionManager({
      modeController: this.modeController,
      riskGovernor: this.riskGovernor,
      permissionGate: this.permissionGate,
      exchangeClient: config?.exchangeClient,
      executionMode: config?.executionMode || 'REAL',
      shadowTracker: config?.shadowTracker, // PHASE 9: Shadow tracker for SHADOW mode
      regimeGate: this.regimeGate || undefined // PHASE 10: Regime gate for regime information
    });

    // PHASE 2: Initialize regime-aware governance
    if (config?.enableRegimeGovernance !== false) {
      this.regimeDetector = new RegimeDetector();
      this.strategyRegistry = new StrategyMetadataRegistry();
      this.regimeGate = new RegimeGate(this.regimeDetector, this.strategyRegistry);
      
      // Register default strategies
      registerDefaultStrategies(this.strategyRegistry);
    } else {
      // Legacy mode - no regime governance
      this.regimeDetector = null;
      this.strategyRegistry = null;
      this.regimeGate = null;
    }

    // PHASE 3: Initialize capital intelligence
    if (config?.enableCapitalGovernance !== false) {
      const initialCapital = config?.initialCapital || 1000;
      const directionalCapital = config?.directionalCapital ?? (initialCapital * 0.7); // 70% directional
      const arbitrageCapital = config?.arbitrageCapital ?? (initialCapital * 0.3); // 30% arbitrage

      this.directionalPool = new CapitalPool(CapitalPoolType.DIRECTIONAL, directionalCapital);
      this.arbitragePool = new CapitalPool(CapitalPoolType.ARBITRAGE, arbitrageCapital);
      this.accountManager = new StrategyCapitalAccountManager();
      
      // Capital allocator requires strategy registry
      if (this.strategyRegistry) {
        this.capitalAllocator = new CapitalAllocator(
          this.directionalPool,
          this.arbitragePool,
          this.accountManager,
          this.strategyRegistry
        );
        this.capitalGate = new CapitalGate(this.accountManager, this.capitalAllocator);
      } else {
        // Can't have capital governance without strategy registry
        this.capitalAllocator = null;
        this.capitalGate = null;
      }
    } else {
      // Legacy mode - no capital governance
      this.directionalPool = null;
      this.arbitragePool = null;
      this.accountManager = null;
      this.capitalAllocator = null;
      this.capitalGate = null;
    }

    // PHASE 4: Initialize observability (always enabled by default)
    if (config?.enableObservability !== false) {
      this.eventLog = new EventLog();
      this.observabilityHooks = new ObservabilityHooks(this.eventLog);
      this.snapshotGenerator = new DailySnapshotGenerator();
      this.attributionEngine = new AttributionEngine();
    } else {
      // Legacy mode - no observability
      this.eventLog = null as any;
      this.observabilityHooks = null as any;
      this.snapshotGenerator = null as any;
      this.attributionEngine = null as any;
    }

    // PHASE 5: Initialize production hardening (always enabled by default)
    if (config?.enableProductionHardening !== false) {
      this.healthMonitor = new SystemHealthMonitor();
      this.startupChecks = new StartupChecks();
      this.dataIntegrityVerifier = new DataIntegrityVerifier();
      this.alertManager = new AlertManager();

      // Fail-safe manager requires event log
      if (this.eventLog) {
        this.failSafeManager = new FailSafeManager(
          this.eventLog,
          this.healthMonitor,
          this.modeController,
          this.riskGovernor
        );

        // Heartbeat monitor requires event log
        this.heartbeatMonitor = new HeartbeatMonitor(
          this.eventLog,
          this.healthMonitor
        );

        // Set up fail-safe callback
        this.failSafeManager.setOnShutdownCallback(() => {
          this.alertManager.alertFailSafe(
            this.failSafeManager!.getFailSafeState().trigger || 'UNKNOWN',
            this.failSafeManager!.getFailSafeState().reason
          );
        });

        // Set up heartbeat safe mode callback
        this.heartbeatMonitor.start(() => {
          // Enter safe mode on heartbeat loss
          this.modeController.setMode('OBSERVE_ONLY', 'Heartbeat loss detected');
          this.alertManager.alertHeartbeatLoss(
            Math.round(this.heartbeatMonitor.getTimeSinceLastHeartbeat() / 1000)
          );
        });
      } else {
        this.failSafeManager = null;
        this.heartbeatMonitor = null;
      }
    } else {
      // Legacy mode - no production hardening
      this.healthMonitor = null as any;
      this.heartbeatMonitor = null;
      this.failSafeManager = null;
      this.startupChecks = null as any;
      this.dataIntegrityVerifier = null as any;
      this.alertManager = null as any;
    }

    // PHASE 7: Initialize account abstraction (optional)
    if (config?.enableAccountAbstraction && config?.phase7AccountManager) {
      this.phase7AccountManager = config.phase7AccountManager;
      this.accountSignalRouter = new AccountSignalRouter(
        this.phase7AccountManager,
        this.regimeGate,
        this.executionManager,
        this.modeController,
        this.accountManager, // Phase 3 StrategyCapitalAccountManager (for backward compatibility)
        this.capitalAllocator,
        this.observabilityHooks // PHASE 4: Observability hooks
      );
    } else {
      this.phase7AccountManager = null;
      this.accountSignalRouter = null;
    }
  }

  /**
   * PHASE 5: Run startup checks
   * 
   * Call this on system startup to verify integrity.
   * Returns false if checks fail (system should start in OBSERVE_ONLY).
   */
  async runStartupChecks(adapterPing?: () => Promise<boolean>): Promise<boolean> {
    if (!this.startupChecks || !this.eventLog) {
      return true; // Production hardening not enabled
    }

    const result = await this.startupChecks.runAllChecks(
      this.eventLog,
      this.snapshotGenerator,
      this.directionalPool,
      this.arbitragePool,
      this.accountManager,
      this.modeController,
      this.riskGovernor,
      adapterPing
    );

    if (!result.passed) {
      // Startup checks failed - enter OBSERVE_ONLY mode
      this.modeController.setMode('OBSERVE_ONLY', 'Startup checks failed');
      
      if (this.alertManager) {
        this.alertManager.alertStartupFailure(result.failures);
      }

      console.error('[STARTUP] Startup checks failed - system in OBSERVE_ONLY mode');
      console.error('[STARTUP] Failures:', result.failures);
      if (result.warnings.length > 0) {
        console.warn('[STARTUP] Warnings:', result.warnings);
      }
    }

    return result.passed;
  }

  /**
   * PHASE 5: Check data integrity
   * 
   * Call this periodically to verify data integrity.
   * Returns false if integrity violations detected.
   */
  checkDataIntegrity(): boolean {
    if (!this.dataIntegrityVerifier || !this.eventLog) {
      return true; // Production hardening not enabled
    }

    const passed = this.dataIntegrityVerifier.runAllChecks(
      this.eventLog,
      this.snapshotGenerator,
      this.directionalPool,
      this.arbitragePool,
      this.accountManager
    );

    if (!passed) {
      const violations = this.dataIntegrityVerifier.getCriticalViolations();
      
      if (violations.length > 0) {
        // Critical violations - enter safe mode
        this.modeController.setMode('OBSERVE_ONLY', 'Data integrity violations detected');
        
        if (this.alertManager) {
          violations.forEach(v => {
            this.alertManager.alertCapitalIntegrityViolation(v.description);
          });
        }

        console.error('[DATA_INTEGRITY] Critical violations detected - system in OBSERVE_ONLY mode');
      }
    }

    return passed;
  }

  /**
   * PHASE 5: Get system health
   */
  getSystemHealth() {
    if (!this.healthMonitor) {
      return null;
    }
    return this.healthMonitor.getSystemHealth();
  }

  /**
   * PHASE 4: Generate daily snapshot
   * 
   * Call this at end of trading day to create immutable snapshot.
   */
  generateDailySnapshot(
    date: Date,
    strategyPnL: Map<string, number> = new Map(),
    strategyDrawdowns: Map<string, number> = new Map()
  ): any {
    if (!this.snapshotGenerator || !this.eventLog) {
      throw new Error('Observability not enabled');
    }

    const directionalMetrics = this.directionalPool?.getMetrics() || {
      totalCapital: 0,
      allocatedCapital: 0,
      availableCapital: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      peakCapital: 0
    };

    const arbitrageMetrics = this.arbitragePool?.getMetrics() || {
      totalCapital: 0,
      allocatedCapital: 0,
      availableCapital: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      peakCapital: 0
    };

    const capitalAllocation = new Map<string, number>();
    if (this.accountManager) {
      this.accountManager.getAllAccounts().forEach(account => {
        capitalAllocation.set(account.strategyId, account.allocatedCapital);
      });
    }

    return this.snapshotGenerator.generateSnapshot(
      date,
      this.eventLog,
      this.modeController.getMode(),
      this.riskGovernor.getRiskState(),
      directionalMetrics,
      arbitrageMetrics,
      strategyPnL,
      strategyDrawdowns,
      capitalAllocation
    );
  }

  /**
   * PHASE 4: Replay a trading day
   */
  replayDay(date: string): any {
    if (!this.eventLog || !this.snapshotGenerator) {
      throw new Error('Observability not enabled');
    }

    const replayEngine = new ReplayEngine();
    const snapshot = this.snapshotGenerator.getSnapshot(date);
    
    return replayEngine.replayDay(date, this.eventLog, snapshot);
  }

  /**
   * Check if trading is currently allowed
   * Fast check for strategies
   */
  isTradingAllowed(): boolean {
    return this.executionManager.isExecutionAllowed();
  }

  /**
   * Get current governance status
   */
  getStatus() {
    return {
      mode: this.modeController.getMode(),
      riskState: this.riskGovernor.getRiskState(),
      permissions: this.modeController.getPermissions(),
      riskMetrics: this.riskGovernor.getRiskMetrics(),
      tradingAllowed: this.isTradingAllowed(),
      // PHASE 2: Regime information
      regimeGovernanceEnabled: this.regimeGate !== null,
      // PHASE 3: Capital information
      capitalGovernanceEnabled: this.capitalGate !== null,
      directionalPool: this.directionalPool?.getMetrics(),
      arbitragePool: this.arbitragePool?.getMetrics()
    };
  }

  /**
   * PHASE 7: Execute trade for accounts (multi-account routing)
   * 
   * Routes strategy signals to all eligible accounts.
   * Each account executes independently with full isolation.
   * 
   * Returns results for all accounts that attempted execution.
   */
  async executeTradeForAccounts(
    request: TradeRequest,
    symbol?: string
  ): Promise<any[]> {
    if (!this.accountSignalRouter) {
      throw new Error('Account abstraction not enabled. Call executeTradeWithRegimeCheck() for single-account mode.');
    }

    return await this.accountSignalRouter.routeSignal(request, symbol);
  }

  /**
   * PHASE 2, 3 & 4: Execute trade with regime, capital checks, and observability
   * 
   * This method checks:
   * 1. Capital availability (PHASE 3 - BEFORE Phase 1)
   * 2. Regime eligibility (PHASE 2 - BEFORE Phase 1)
   * 3. Phase 1 governance (PermissionGate, RiskGovernor)
   * 4. Logs all decisions (PHASE 4 - Observability)
   * 
   * If any check fails, execution is blocked.
   * 
   * NOTE: For Phase 7 multi-account mode, use executeTradeForAccounts() instead.
   */
  async executeTradeWithRegimeCheck(
    request: TradeRequest,
    symbol?: string,
    regimeResult?: any
  ): Promise<TradeResult & { 
    regimeBlocked?: boolean; 
    regimeReason?: string;
    capitalBlocked?: boolean;
    capitalReason?: string;
  }> {
    const systemMode = this.modeController.getMode();
    const symbolToCheck = symbol || request.pair;

    // PHASE 4: Log signal generated
    if (this.observabilityHooks) {
      // Signal generation would be logged by strategy layer
    }

    // PHASE 3: Check capital availability FIRST (before regime and Phase 1)
    if (this.capitalGate) {
      const capitalCheck = this.capitalGate.checkCapital(request.strategy, request.estimatedValue);

      // PHASE 4: Log capital check
      if (this.observabilityHooks) {
        this.observabilityHooks.logCapitalCheck(
          request.strategy,
          request.estimatedValue,
          capitalCheck,
          systemMode
        );
      }

      if (!capitalCheck.allowed) {
        // PHASE 4: Log trade blocked
        if (this.observabilityHooks) {
          this.observabilityHooks.logTradeBlocked(
            request,
            'CAPITAL',
            capitalCheck.reason || 'Insufficient capital',
            systemMode
          );
        }

        console.warn(
          `[GOVERNANCE_SYSTEM] Trade blocked by capital gate: ${request.strategy} on ${request.pair}. ` +
          `Reason: ${capitalCheck.reason}`
        );

        return {
          success: false,
          pair: request.pair,
          strategy: request.strategy,
          timestamp: new Date(),
          pnl: 0,
          capitalBlocked: true,
          capitalReason: capitalCheck.reason
        };
      }
    }

    // PHASE 2: Check regime eligibility (before Phase 1 governance)
    if (this.regimeGate) {
      const regimeCheck = this.regimeGate.checkEligibility(request.strategy, symbolToCheck);

      // PHASE 4: Log regime check
      if (this.observabilityHooks) {
        this.observabilityHooks.logRegimeCheck(
          request.strategy,
          symbolToCheck,
          regimeCheck,
          systemMode
        );
      }

      if (!regimeCheck.allowed) {
        // PHASE 4: Log trade blocked
        if (this.observabilityHooks) {
          this.observabilityHooks.logTradeBlocked(
            request,
            'REGIME',
            regimeCheck.reason || 'Regime mismatch',
            systemMode,
            regimeCheck.regime as MarketRegime,
            regimeCheck.regimeConfidence
          );
        }

        console.warn(
          `[GOVERNANCE_SYSTEM] Trade blocked by regime gate: ${request.strategy} on ${symbolToCheck}. ` +
          `Reason: ${regimeCheck.reason}. Regime: ${regimeCheck.regime}`
        );

        return {
          success: false,
          pair: request.pair,
          strategy: request.strategy,
          timestamp: new Date(),
          pnl: 0,
          regimeBlocked: true,
          regimeReason: regimeCheck.reason
        };
      }

      // Regime check passed - update price history
      if (request.price) {
        this.regimeGate.updatePriceHistory(symbolToCheck, request.price);
      }
    }

    // Proceed to Phase 1 governance (ExecutionManager)
    // PHASE 4: ExecutionManager will log permission/risk checks internally
    const result = await this.executionManager.executeTrade(request);

    // PHASE 4: Log trade executed or blocked
    if (this.observabilityHooks) {
      if (result.success) {
        const regime = this.regimeGate?.getCurrentRegime(symbolToCheck);
        this.observabilityHooks.logTradeExecuted(
          request,
          result,
          systemMode,
          regime?.regime as MarketRegime,
          regime?.confidence
        );
      } else {
        // Trade was blocked by Phase 1 governance
        this.observabilityHooks.logTradeBlocked(
          request,
          'PERMISSION', // Or 'RISK' depending on which gate blocked it
          'Blocked by Phase 1 governance',
          systemMode
        );
      }
    }

    return result;
  }

  /**
   * PHASE 2: Update price history for regime detection
   */
  updatePriceHistory(symbol: string, price: number): void {
    if (this.regimeGate) {
      this.regimeGate.updatePriceHistory(symbol, price);
    }
  }

  /**
   * PHASE 2: Get current regime for a symbol
   */
  getCurrentRegime(symbol: string) {
    if (!this.regimeGate) {
      return null;
    }
    return this.regimeGate.getCurrentRegime(symbol);
  }

  /**
   * PHASE 2: Get eligible strategies for current regime
   */
  getEligibleStrategies(symbol: string): string[] {
    if (!this.regimeGate) {
      return [];
    }
    return this.regimeGate.getEligibleStrategies(symbol);
  }
}

/**
 * Create a TradeRequest from strategy signal
 * 
 * Helper function to convert existing signal formats to TradeRequest
 */
export function createTradeRequest(params: {
  strategy: string;
  pair: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
}): TradeRequest {
  return {
    strategy: params.strategy,
    pair: params.pair,
    action: params.action,
    amount: params.amount,
    price: params.price,
    estimatedValue: params.amount * params.price,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit
  };
}

/**
 * PHASE 2 & 3: Execute trade with regime and capital checks (helper function)
 * 
 * This function can be used with ExecutionManager to add regime and capital checks.
 * It checks capital and regime eligibility BEFORE calling ExecutionManager.
 * 
 * Usage:
 *   const result = await executeTradeWithRegimeCheck(
 *     executionManager,
 *     regimeGate,
 *     capitalGate,
 *     request,
 *     symbol,
 *     regimeResult
 *   );
 */
export async function executeTradeWithRegimeCheck(
  executionManager: ExecutionManager,
  regimeGate: RegimeGate | null,
  capitalGate: CapitalGate | null,
  request: TradeRequest,
  symbol?: string,
  regimeResult?: any
): Promise<TradeResult & { 
  regimeBlocked?: boolean; 
  regimeReason?: string;
  capitalBlocked?: boolean;
  capitalReason?: string;
}> {
  // PHASE 3: Check capital availability FIRST (before regime and Phase 1)
  if (capitalGate) {
    const capitalCheck = capitalGate.checkCapital(request.strategy, request.estimatedValue);

    if (!capitalCheck.allowed) {
      // Capital check failed - block execution
      console.warn(
        `[GOVERNANCE] Trade blocked by capital gate: ${request.strategy} on ${request.pair}. ` +
        `Reason: ${capitalCheck.reason}`
      );

      return {
        success: false,
        pair: request.pair,
        strategy: request.strategy,
        timestamp: new Date(),
        pnl: 0,
        capitalBlocked: true,
        capitalReason: capitalCheck.reason
      };
    }
  }

  // PHASE 2: Check regime eligibility (before Phase 1 governance)
  if (regimeGate) {
    const symbolToCheck = symbol || request.pair;
    const regimeCheck = regimeGate.checkEligibility(request.strategy, symbolToCheck);

    if (!regimeCheck.allowed) {
      // Regime check failed - block execution
      console.warn(
        `[GOVERNANCE] Trade blocked by regime gate: ${request.strategy} on ${symbolToCheck}. ` +
        `Reason: ${regimeCheck.reason}. Regime: ${regimeCheck.regime}`
      );

      return {
        success: false,
        pair: request.pair,
        strategy: request.strategy,
        timestamp: new Date(),
        pnl: 0,
        regimeBlocked: true,
        regimeReason: regimeCheck.reason
      };
    }

    // Regime check passed - update price history
    if (request.price) {
      regimeGate.updatePriceHistory(symbolToCheck, request.price);
    }
  }

  // Proceed to Phase 1 governance (ExecutionManager)
  return await executionManager.executeTrade(request);
}

