/**
 * Account Signal Router
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Routes strategy signals to eligible accounts.
 * 
 * Flow:
 * Strategy Signal (global)
 *   ↓
 * For each account with strategy enabled:
 *   Account Strategy Permission Check
 *   Account CapitalGate
 *   Account RegimeGate
 *   Account RiskGovernor
 *   Global ExecutionManager
 */

import { Account } from './account';
import { AccountManager } from './account_manager';
import { TradeRequest, TradeResult } from '../../src/services/riskGovernor';
import { AccountGovernanceRouter, AccountCapitalGate, AccountPermissionGate } from './account_governance';
import { RegimeGate } from '../regime_gate';
import { ExecutionManager } from '../execution_manager';
import { ModeController } from '../mode_controller';
import { StrategyCapitalAccountManager } from '../capital/strategy_capital_account';
import { CapitalAllocator } from '../capital/capital_allocator';
import { ObservabilityHooks } from '../observability/observability_integration';
import { AccountRiskBudgetGate } from '../risk_budget/account_risk_budget_gate';

export interface RoutedTradeResult extends TradeResult {
  accountId: string;
  routed: boolean;
  reason?: string;
}

/**
 * Account Signal Router
 * 
 * Routes strategy signals to all eligible accounts.
 * Each account executes independently with full isolation.
 */
export class AccountSignalRouter {
  private accountManager: AccountManager;
  private regimeGate: RegimeGate | null;
  private executionManager: ExecutionManager;
  private modeController: ModeController;
  private strategyAccountManager: StrategyCapitalAccountManager;
  private capitalAllocator: CapitalAllocator | null;
  private observabilityHooks: ObservabilityHooks | null;

  // Cache of account governance routers
  private accountRouters: Map<string, AccountGovernanceRouter> = new Map();

  constructor(
    accountManager: AccountManager,
    regimeGate: RegimeGate | null,
    executionManager: ExecutionManager,
    modeController: ModeController,
    strategyAccountManager: StrategyCapitalAccountManager,
    capitalAllocator: CapitalAllocator | null,
    observabilityHooks?: ObservabilityHooks | null
  ) {
    this.accountManager = accountManager;
    this.regimeGate = regimeGate;
    this.executionManager = executionManager;
    this.modeController = modeController;
    this.strategyAccountManager = strategyAccountManager;
    this.capitalAllocator = capitalAllocator;
    this.observabilityHooks = observabilityHooks || null;
  }

  /**
   * Route a strategy signal to all eligible accounts
   * 
   * This is the main entry point for Phase 7 execution.
   * Each account that has the strategy enabled will attempt execution
   * independently, with full isolation.
   */
  async routeSignal(request: TradeRequest, symbol?: string): Promise<RoutedTradeResult[]> {
    const results: RoutedTradeResult[] = [];

    // Find all accounts with this strategy enabled
    const eligibleAccounts = this.accountManager.getAccountsWithStrategy(request.strategy);

    if (eligibleAccounts.length === 0) {
      // No accounts have this strategy enabled
      console.log(`[ACCOUNT_SIGNAL_ROUTER] No accounts have strategy ${request.strategy} enabled`);
      return results;
    }

    // Route signal to each eligible account
    for (const account of eligibleAccounts) {
      try {
        const router = this.getAccountRouter(account);
        const result = await router.executeTrade(request, symbol);

        results.push({
          ...result,
          routed: true
        });
      } catch (error: any) {
        console.error(`[ACCOUNT_SIGNAL_ROUTER] Error routing to account ${account.accountId}:`, error);
        results.push({
          success: false,
          accountId: account.accountId,
          pair: request.pair,
          strategy: request.strategy,
          timestamp: new Date(),
          pnl: 0,
          routed: false,
          reason: error.message || 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Get or create account governance router
   */
  private getAccountRouter(account: Account): AccountGovernanceRouter {
    let router = this.accountRouters.get(account.accountId);
    
    if (!router) {
      // Import account governance components
      const { AccountCapitalGate, AccountPermissionGate } = require('./account_governance');
      
      // Create account-specific capital gate (uses account's own pools)
      const accountCapitalGate = new AccountCapitalGate(account);

      // Create account-specific permission gate (uses account's risk governor)
      const accountPermissionGate = new AccountPermissionGate(
        account,
        this.modeController
      );

      // PHASE 8: Create account risk budget gate (if risk budget is enabled)
      let accountRiskBudgetGate: AccountRiskBudgetGate | null = null;
      if (account.riskBudget && account.strategyRiskAllocator) {
        accountRiskBudgetGate = new AccountRiskBudgetGate(
          account.riskBudget,
          account.strategyRiskAllocator
        );
      }

      router = new AccountGovernanceRouter(
        account,
        accountCapitalGate,
        accountPermissionGate,
        this.regimeGate,
        this.executionManager,
        this.modeController,
        this.observabilityHooks,
        accountRiskBudgetGate // PHASE 8: Risk budget gate
      );

      this.accountRouters.set(account.accountId, router);
    }

    return router;
  }

  /**
   * Get accounts eligible for a strategy
   */
  getEligibleAccounts(strategyId: string): Account[] {
    return this.accountManager.getAccountsWithStrategy(strategyId);
  }
}

