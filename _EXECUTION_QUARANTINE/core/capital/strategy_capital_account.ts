/**
 * Strategy Capital Account
 * 
 * PHASE 3: Capital Intelligence & Governance
 * 
 * Each strategy receives a capital account from its pool.
 * Strategies never self-allocate capital.
 * All allocation decisions are centralized.
 */

import { CapitalPoolType } from './capital_pool';
import { StrategyState } from '../strategy_metadata';

export interface StrategyCapitalAccount {
  strategyId: string;
  poolType: CapitalPoolType;
  allocatedCapital: number;
  peakCapital: number;
  currentDrawdown: number;
  state: StrategyState;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Strategy Capital Account Manager
 * 
 * Manages capital accounts for all strategies.
 * Centralizes allocation decisions.
 */
export class StrategyCapitalAccountManager {
  private accounts: Map<string, StrategyCapitalAccount> = new Map();

  /**
   * Create or update a strategy capital account
   */
  createAccount(
    strategyId: string,
    poolType: CapitalPoolType,
    initialAllocation: number = 0
  ): StrategyCapitalAccount {
    const now = new Date();
    const account: StrategyCapitalAccount = {
      strategyId,
      poolType,
      allocatedCapital: initialAllocation,
      peakCapital: initialAllocation,
      currentDrawdown: 0,
      state: StrategyState.DISABLED,
      createdAt: now,
      updatedAt: now
    };

    this.accounts.set(strategyId, account);
    return account;
  }

  /**
   * Get strategy capital account
   */
  getAccount(strategyId: string): StrategyCapitalAccount | undefined {
    return this.accounts.get(strategyId);
  }

  /**
   * Update allocated capital for a strategy
   */
  updateAllocation(strategyId: string, newAllocation: number): boolean {
    const account = this.accounts.get(strategyId);
    if (!account) {
      return false;
    }

    account.allocatedCapital = Math.max(0, newAllocation);
    account.updatedAt = new Date();

    // Update peak capital
    if (account.allocatedCapital > account.peakCapital) {
      account.peakCapital = account.allocatedCapital;
    }

    // Calculate drawdown
    const drawdown = account.peakCapital > 0
      ? ((account.peakCapital - account.allocatedCapital) / account.peakCapital) * 100
      : 0;
    account.currentDrawdown = Math.max(0, drawdown);

    return true;
  }

  /**
   * Update strategy state
   */
  updateState(strategyId: string, newState: StrategyState): boolean {
    const account = this.accounts.get(strategyId);
    if (!account) {
      return false;
    }

    account.state = newState;
    account.updatedAt = new Date();

    return true;
  }

  /**
   * Get allocated capital for a strategy
   */
  getAllocatedCapital(strategyId: string): number {
    const account = this.accounts.get(strategyId);
    return account?.allocatedCapital ?? 0;
  }

  /**
   * Check if strategy has capital allocated
   */
  hasCapital(strategyId: string): boolean {
    return this.getAllocatedCapital(strategyId) > 0;
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): StrategyCapitalAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get accounts by pool type
   */
  getAccountsByPoolType(poolType: CapitalPoolType): StrategyCapitalAccount[] {
    return Array.from(this.accounts.values()).filter(
      account => account.poolType === poolType
    );
  }
}

