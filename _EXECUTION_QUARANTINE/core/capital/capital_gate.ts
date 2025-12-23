/**
 * Capital Gate
 * 
 * PHASE 3: Capital Intelligence & Governance
 * 
 * This gate checks capital availability BEFORE Phase 1 governance.
 * It ensures strategies have allocated capital before execution requests.
 * 
 * Flow:
 * Strategy generates signal → CapitalGate.checkCapital() → (if sufficient) → RegimeGate → Phase 1 PermissionGate → Execution
 */

import { StrategyCapitalAccountManager } from './strategy_capital_account';
import { CapitalAllocator } from './capital_allocator';

export interface CapitalGateResult {
  allowed: boolean;
  reason?: string;
  allocatedCapital?: number;
  requestedAmount?: number;
}

/**
 * Capital Gate
 * 
 * Checks if a strategy has sufficient allocated capital for execution.
 * Capital checks occur BEFORE Phase 1 governance.
 */
export class CapitalGate {
  private accountManager: StrategyCapitalAccountManager;
  private capitalAllocator: CapitalAllocator;

  constructor(
    accountManager: StrategyCapitalAccountManager,
    capitalAllocator: CapitalAllocator
  ) {
    this.accountManager = accountManager;
    this.capitalAllocator = capitalAllocator;
  }

  /**
   * Check if strategy has sufficient capital for trade
   * 
   * STEP 6: Capital checks occur before Phase 1 governance.
   * 
   * @param strategyId Strategy identifier
   * @param tradeValue Estimated value of the trade in USD
   * @returns Capital gate result
   */
  checkCapital(strategyId: string, tradeValue: number): CapitalGateResult {
    // Get strategy account
    const account = this.accountManager.getAccount(strategyId);
    
    if (!account) {
      return {
        allowed: false,
        reason: `Strategy ${strategyId} has no capital account`
      };
    }

    // Check if strategy has any allocated capital
    if (account.allocatedCapital === 0) {
      return {
        allowed: false,
        reason: `Strategy ${strategyId} has zero allocated capital`,
        allocatedCapital: 0,
        requestedAmount: tradeValue
      };
    }

    // Check if trade value exceeds allocated capital
    if (tradeValue > account.allocatedCapital) {
      return {
        allowed: false,
        reason: `Trade value $${tradeValue.toFixed(2)} exceeds allocated capital $${account.allocatedCapital.toFixed(2)}`,
        allocatedCapital: account.allocatedCapital,
        requestedAmount: tradeValue
      };
    }

    // Capital check passed
    return {
      allowed: true,
      allocatedCapital: account.allocatedCapital,
      requestedAmount: tradeValue
    };
  }

  /**
   * Get allocated capital for strategy
   */
  getAllocatedCapital(strategyId: string): number {
    return this.accountManager.getAllocatedCapital(strategyId);
  }

  /**
   * Check if strategy has capital
   */
  hasCapital(strategyId: string): boolean {
    return this.accountManager.hasCapital(strategyId);
  }
}

