/**
 * Account-Scoped Governance Wrappers
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Wrappers that route governance checks through account-specific instances
 * while preserving global execution authority.
 * 
 * Flow:
 * 1. Account Strategy Permission Check (account-scoped)
 * 2. Account CapitalGate (account-scoped)
 * 3. Account RegimeGate (uses global regime, but account-scoped eligibility)
 * 4. Account RiskGovernor (account-scoped)
 * 5. Global ExecutionManager (unchanged)
 */

import { Account } from './account';
import { TradeRequest, TradeResult } from '../../src/services/riskGovernor';
import { CapitalGate } from '../capital/capital_gate';
import { RegimeGate } from '../regime_gate';
import { PermissionGate } from '../permission_gate';
import { ModeController } from '../mode_controller';
import { ExecutionManager } from '../execution_manager';
import { StrategyCapitalAccountManager } from '../capital/strategy_capital_account';
import { CapitalAllocator } from '../capital/capital_allocator';
import { ObservabilityHooks } from '../observability/observability_integration';
import { AccountRiskBudgetGate } from '../risk_budget/account_risk_budget_gate';

export interface AccountGovernanceResult extends TradeResult {
  accountId: string;
  riskBudgetBlocked?: boolean; // PHASE 8: Risk budget gate blocked
  strategyPermissionBlocked?: boolean;
  capitalBlocked?: boolean;
  regimeBlocked?: boolean;
  riskBlocked?: boolean;
  reason?: string;
}

/**
 * Account Capital Gate Wrapper
 * 
 * Routes capital checks through account-specific capital pools.
 * 
 * PHASE 7: Accounts have their own capital pools, so we check directly
 * against the account's pools rather than using the global CapitalGate.
 */
export class AccountCapitalGate {
  private account: Account;

  constructor(account: Account) {
    this.account = account;
  }

  /**
   * Check if account has sufficient capital for trade
   * 
   * For Phase 7, we check account's own capital pools.
   * Strategy-level capital allocation (Phase 3) is handled per-account.
   */
  checkCapital(strategyId: string, estimatedValue: number): { allowed: boolean; reason?: string } {
    // First check account state
    if (!this.account.canTrade()) {
      return {
        allowed: false,
        reason: `Account ${this.account.accountId} is in ${this.account.getState()} state`
      };
    }

    // Check account's capital pools
    const capitalMetrics = this.account.getCapitalMetrics();
    
    // For Phase 7, we check total available capital across both pools
    // In a full implementation, we'd check strategy metadata to determine
    // which pool type to use (DIRECTIONAL vs ARBITRAGE)
    const availableCapital = capitalMetrics.directionalPool.availableCapital + 
                            capitalMetrics.arbitragePool.availableCapital;

    if (estimatedValue > availableCapital) {
      return {
        allowed: false,
        reason: `Insufficient capital: requested $${estimatedValue.toFixed(2)}, available $${availableCapital.toFixed(2)}`
      };
    }

    // Check if account has exceeded drawdown limits
    if (capitalMetrics.directionalPool.currentDrawdown >= capitalMetrics.directionalPool.maxDrawdown) {
      return {
        allowed: false,
        reason: `Directional pool drawdown ${capitalMetrics.directionalPool.currentDrawdown.toFixed(2)}% exceeds limit ${capitalMetrics.directionalPool.maxDrawdown}%`
      };
    }

    if (capitalMetrics.arbitragePool.currentDrawdown >= capitalMetrics.arbitragePool.maxDrawdown) {
      return {
        allowed: false,
        reason: `Arbitrage pool drawdown ${capitalMetrics.arbitragePool.currentDrawdown.toFixed(2)}% exceeds limit ${capitalMetrics.arbitragePool.maxDrawdown}%`
      };
    }

    return { allowed: true };
  }
}

/**
 * Account Permission Gate Wrapper
 * 
 * Routes permission checks through account-specific risk governor
 * while using global mode controller.
 */
export class AccountPermissionGate {
  private account: Account;
  private modeController: ModeController;
  private permissionGate: PermissionGate;

  constructor(account: Account, modeController: ModeController) {
    this.account = account;
    this.modeController = modeController;
    // Create account-specific permission gate using account's risk governor
    this.permissionGate = new PermissionGate(modeController, account.riskGovernor);
  }

  /**
   * Check if trade is permitted for this account
   */
  checkPermission(request: TradeRequest): { allowed: boolean; reason?: string; source?: string } {
    // First check account state
    if (!this.account.canTrade()) {
      return {
        allowed: false,
        reason: `Account ${this.account.accountId} is in ${this.account.getState()} state`,
        source: 'ACCOUNT_STATE'
      };
    }

    // Check account strategy permission
    if (!this.account.isStrategyEnabled(request.strategy)) {
      return {
        allowed: false,
        reason: `Strategy ${request.strategy} is not enabled for account ${this.account.accountId}`,
        source: 'ACCOUNT_STRATEGY_PERMISSION'
      };
    }

    // Use account-specific permission gate
    const permission = this.permissionGate.checkPermission(request);
    
    return {
      allowed: permission.allowed,
      reason: permission.reason,
      source: permission.source
    };
  }
}

/**
 * Account Governance Router
 * 
 * Routes trade requests through account-specific governance checks
 * before passing to global ExecutionManager.
 */
export class AccountGovernanceRouter {
  private account: Account;
  private accountRiskBudgetGate: AccountRiskBudgetGate | null; // PHASE 8: Risk budget gate
  private accountCapitalGate: AccountCapitalGate;
  private accountPermissionGate: AccountPermissionGate;
  private regimeGate: RegimeGate | null;
  private executionManager: ExecutionManager;
  private modeController: ModeController;
  private observabilityHooks: ObservabilityHooks | null;

  constructor(
    account: Account,
    accountCapitalGate: AccountCapitalGate,
    accountPermissionGate: AccountPermissionGate,
    regimeGate: RegimeGate | null,
    executionManager: ExecutionManager,
    modeController: ModeController,
    observabilityHooks?: ObservabilityHooks | null,
    accountRiskBudgetGate?: AccountRiskBudgetGate | null // PHASE 8: Optional risk budget gate
  ) {
    this.account = account;
    this.accountRiskBudgetGate = accountRiskBudgetGate || null;
    this.accountCapitalGate = accountCapitalGate;
    this.accountPermissionGate = accountPermissionGate;
    this.regimeGate = regimeGate;
    this.executionManager = executionManager;
    this.modeController = modeController;
    this.observabilityHooks = observabilityHooks || null;
  }

  /**
   * Execute trade through account-specific governance
   * 
   * Flow:
   * 1. Account Strategy Permission Check
   * 2. Account Risk Budget Gate (PHASE 8)
   * 3. Account CapitalGate
   * 4. Account RegimeGate (uses global regime detection)
   * 5. Account PermissionGate (uses account risk governor)
   * 6. Global ExecutionManager
   */
  async executeTrade(
    request: TradeRequest,
    symbol?: string
  ): Promise<AccountGovernanceResult> {
    const accountId = this.account.accountId;
    const symbolToCheck = symbol || request.pair;

    const systemMode = this.modeController.getMode();

    // Step 1: Check account strategy permission
    if (!this.account.isStrategyEnabled(request.strategy)) {
      const result = {
        success: false,
        accountId,
        pair: request.pair,
        strategy: request.strategy,
        timestamp: new Date(),
        pnl: 0,
        strategyPermissionBlocked: true,
        reason: `Strategy ${request.strategy} is not enabled for account ${accountId}`
      };

      // PHASE 4: Log trade blocked
      if (this.observabilityHooks) {
        this.observabilityHooks.logTradeBlocked(
          request,
          'PERMISSION',
          result.reason || 'Strategy not enabled for account',
          systemMode,
          undefined,
          undefined,
          accountId
        );
      }

      return result;
    }

    // Step 2: PHASE 8 - Check account risk budget (BEFORE capital gate)
    if (this.accountRiskBudgetGate) {
      const capitalMetrics = this.account.getCapitalMetrics();
      const accountEquity = capitalMetrics.currentEquity;
      
      const riskBudgetCheck = this.accountRiskBudgetGate.checkRiskBudget(request, accountEquity);
      
      // PHASE 4: Log risk budget check
      if (this.observabilityHooks) {
        this.observabilityHooks.logRiskBudgetCheck(
          accountId,
          request.strategy,
          riskBudgetCheck.requestedRiskPct || 0,
          riskBudgetCheck.allocatedRiskPct || 0,
          riskBudgetCheck.effectiveRiskPct || 0,
          riskBudgetCheck.allowed,
          riskBudgetCheck.reason || (riskBudgetCheck.allowed ? 'Risk budget check passed' : 'Risk budget exceeded'),
          systemMode
        );
      }

      if (!riskBudgetCheck.allowed) {
        const result = {
          success: false,
          accountId,
          pair: request.pair,
          strategy: request.strategy,
          timestamp: new Date(),
          pnl: 0,
          riskBudgetBlocked: true,
          reason: riskBudgetCheck.reason
        };

        // PHASE 4: Log trade blocked
        if (this.observabilityHooks) {
          this.observabilityHooks.logTradeBlocked(
            request,
            'RISK', // Using RISK as blocking layer for risk budget
            riskBudgetCheck.reason || 'Risk budget exceeded',
            systemMode,
            undefined,
            undefined,
            accountId
          );
        }

        return result;
      }
    }

    // Step 3: Check account capital
    const capitalCheck = this.accountCapitalGate.checkCapital(request.strategy, request.estimatedValue);
    
    // PHASE 4: Log capital check
    if (this.observabilityHooks) {
      this.observabilityHooks.logCapitalCheck(
        request.strategy,
        request.estimatedValue,
        { allowed: capitalCheck.allowed, reason: capitalCheck.reason },
        systemMode,
        accountId
      );
    }

    if (!capitalCheck.allowed) {
      const result = {
        success: false,
        accountId,
        pair: request.pair,
        strategy: request.strategy,
        timestamp: new Date(),
        pnl: 0,
        capitalBlocked: true,
        reason: capitalCheck.reason
      };

      // PHASE 4: Log trade blocked
      if (this.observabilityHooks) {
        this.observabilityHooks.logTradeBlocked(
          request,
          'CAPITAL',
          capitalCheck.reason || 'Insufficient capital',
          systemMode,
          undefined,
          undefined,
          accountId
        );
      }

      return result;
    }

    // Step 4: Check regime eligibility (uses global regime detection)
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
        const result = {
          success: false,
          accountId,
          pair: request.pair,
          strategy: request.strategy,
          timestamp: new Date(),
          pnl: 0,
          regimeBlocked: true,
          reason: regimeCheck.reason
        };

        // PHASE 4: Log trade blocked
        if (this.observabilityHooks) {
          this.observabilityHooks.logTradeBlocked(
            request,
            'REGIME',
            regimeCheck.reason || 'Regime mismatch',
            systemMode,
            regimeCheck.regime as any,
            regimeCheck.regimeConfidence,
            accountId
          );
        }

        return result;
      }
    }

    // Step 5: Check account permission (uses account risk governor)
    const permissionCheck = this.accountPermissionGate.checkPermission(request);
    
    // PHASE 4: Log permission check
    if (this.observabilityHooks) {
      this.observabilityHooks.logPermissionCheck(
        request.strategy,
        permissionCheck,
        systemMode
      );
    }

    if (!permissionCheck.allowed) {
      const result = {
        success: false,
        accountId,
        pair: request.pair,
        strategy: request.strategy,
        timestamp: new Date(),
        pnl: 0,
        riskBlocked: true,
        reason: permissionCheck.reason
      };

      // PHASE 4: Log trade blocked
      if (this.observabilityHooks) {
        this.observabilityHooks.logTradeBlocked(
          request,
          'RISK',
          permissionCheck.reason || 'Risk check failed',
          systemMode,
          undefined,
          undefined,
          accountId
        );
      }

      return result;
    }

    // Step 5: Execute through global ExecutionManager
    // Note: ExecutionManager will still use its own permission gate,
    // but we've already checked account-specific risk governor
    // We need to ensure ExecutionManager respects account isolation
    const result = await this.executionManager.executeTrade(request);

    // Update account equity based on result
    if (result.success && result.pnl !== undefined) {
      this.account.updateEquity(result.pnl);
    }

    // PHASE 4: Log trade executed or blocked
    if (this.observabilityHooks) {
      if (result.success) {
        const regime = this.regimeGate?.getCurrentRegime(symbolToCheck);
        this.observabilityHooks.logTradeExecuted(
          request,
          result,
          systemMode,
          regime?.regime as any,
          regime?.confidence,
          accountId
        );
      } else {
        // Trade was blocked by ExecutionManager
        this.observabilityHooks.logTradeBlocked(
          request,
          'PERMISSION',
          'Blocked by ExecutionManager',
          systemMode,
          undefined,
          undefined,
          accountId
        );
      }
    }

    return {
      ...result,
      accountId
    };
  }
}

