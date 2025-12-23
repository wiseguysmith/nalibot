/**
 * Account Risk Budget Gate
 * 
 * PHASE 8: Formal Risk Budgeting
 * 
 * Pre-execution gate that checks if trade would exceed allocated risk.
 * 
 * Execution order:
 * AccountRiskBudgetGate  ← PHASE 8 (this gate)
 * ↓
 * AccountCapitalGate     ← PHASE 7
 * ↓
 * RegimeGate             ← PHASE 2
 * ↓
 * PermissionGate         ← PHASE 1
 * ↓
 * RiskGovernor           ← PHASE 1
 * ↓
 * ExecutionManager
 */

import { TradeRequest } from '../../src/services/riskGovernor';
import { AccountRiskBudget } from './account_risk_budget';
import { StrategyRiskAllocator } from './strategy_risk_allocator';

export interface RiskBudgetGateResult {
  allowed: boolean;
  reason?: string;
  allocatedRiskPct?: number;
  requestedRiskPct?: number;
  effectiveRiskPct?: number;
}

/**
 * Account Risk Budget Gate
 * 
 * Checks if trade would exceed strategy's allocated risk budget.
 * This gate runs BEFORE CapitalGate.
 */
export class AccountRiskBudgetGate {
  private accountRiskBudget: AccountRiskBudget;
  private strategyRiskAllocator: StrategyRiskAllocator;

  constructor(
    accountRiskBudget: AccountRiskBudget,
    strategyRiskAllocator: StrategyRiskAllocator
  ) {
    this.accountRiskBudget = accountRiskBudget;
    this.strategyRiskAllocator = strategyRiskAllocator;
  }

  /**
   * Check if trade is within risk budget
   * 
   * @param request Trade request
   * @param accountEquity Current account equity (for risk percentage calculation)
   * @returns Risk budget gate result
   */
  checkRiskBudget(
    request: TradeRequest,
    accountEquity: number
  ): RiskBudgetGateResult {
    // Get strategy allocation
    const allocation = this.strategyRiskAllocator.getAllocation(request.strategy);

    if (!allocation) {
      return {
        allowed: false,
        reason: `Strategy ${request.strategy} has no risk allocation`
      };
    }

    // Calculate requested risk percentage
    // Risk % = (trade value / account equity) × 100
    const requestedRiskPct = accountEquity > 0
      ? (request.estimatedValue / accountEquity) * 100
      : 0;

    // Check if requested risk exceeds allocated risk
    if (requestedRiskPct > allocation.allocatedRiskPct) {
      return {
        allowed: false,
        reason: `Trade risk ${requestedRiskPct.toFixed(2)}% exceeds allocated risk ${allocation.allocatedRiskPct.toFixed(2)}% for strategy ${request.strategy}`,
        allocatedRiskPct: allocation.allocatedRiskPct,
        requestedRiskPct,
        effectiveRiskPct: this.accountRiskBudget.getEffectiveRiskPct()
      };
    }

    // Check if requested risk exceeds account's effective risk budget
    const effectiveRiskPct = this.accountRiskBudget.getEffectiveRiskPct();
    if (requestedRiskPct > effectiveRiskPct) {
      return {
        allowed: false,
        reason: `Trade risk ${requestedRiskPct.toFixed(2)}% exceeds account effective risk budget ${effectiveRiskPct.toFixed(2)}%`,
        allocatedRiskPct: allocation.allocatedRiskPct,
        requestedRiskPct,
        effectiveRiskPct
      };
    }

    // Risk budget check passed
    return {
      allowed: true,
      allocatedRiskPct: allocation.allocatedRiskPct,
      requestedRiskPct,
      effectiveRiskPct
    };
  }

  /**
   * Get risk budget summary
   */
  getSummary(): {
    accountId: string;
    effectiveRiskPct: number;
    totalAllocatedRiskPct: number;
    strategyAllocations: Array<{
      strategyId: string;
      allocatedRiskPct: number;
      weight: number;
    }>;
  } {
    const budgetSummary = this.accountRiskBudget.getSummary();
    const allocatorSummary = this.strategyRiskAllocator.getSummary();

    return {
      accountId: budgetSummary.accountId,
      effectiveRiskPct: budgetSummary.effectiveRiskPct,
      totalAllocatedRiskPct: allocatorSummary.totalAllocatedRiskPct,
      strategyAllocations: allocatorSummary.allocations.map(alloc => ({
        strategyId: alloc.strategyId,
        allocatedRiskPct: alloc.allocatedRiskPct,
        weight: alloc.weight
      }))
    };
  }
}

