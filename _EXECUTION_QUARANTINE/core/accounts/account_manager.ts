/**
 * Account Manager
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Centralized account lifecycle management.
 * Ensures account isolation and enforces invariants.
 */

import { Account, AccountConfig, AccountState } from './account';
import { EntityManager } from './entity';

/**
 * Account Manager
 * 
 * Manages account creation, lifecycle, and isolation.
 * Ensures no account can affect another account's capital or state.
 */
export class AccountManager {
  private accounts: Map<string, Account> = new Map();
  private entityManager: EntityManager;

  constructor(entityManager?: EntityManager) {
    this.entityManager = entityManager || new EntityManager();
  }

  /**
   * Create a new account
   */
  createAccount(config: AccountConfig): Account {
    if (this.accounts.has(config.accountId)) {
      throw new Error(`Account ${config.accountId} already exists`);
    }

    const account = new Account(config);
    this.accounts.set(config.accountId, account);

    // Link to entity if provided
    if (config.entityId) {
      this.entityManager.addAccountToEntity(config.entityId, config.accountId);
    }

    console.log(`[ACCOUNT_MANAGER] Created account: ${config.accountId}`);

    return account;
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): Account | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get active accounts (can trade)
   */
  getActiveAccounts(): Account[] {
    return Array.from(this.accounts.values()).filter(account => account.canTrade());
  }

  /**
   * Get accounts with strategy enabled
   */
  getAccountsWithStrategy(strategyId: string): Account[] {
    return Array.from(this.accounts.values()).filter(account => 
      account.isStrategyEnabled(strategyId) && account.canTrade()
    );
  }

  /**
   * Enable strategy for account
   */
  enableStrategyForAccount(accountId: string, strategyId: string): void {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    account.enableStrategy(strategyId);
  }

  /**
   * Disable strategy for account
   */
  disableStrategyForAccount(accountId: string, strategyId: string): void {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    account.disableStrategy(strategyId);
  }

  /**
   * Set account state
   */
  setAccountState(accountId: string, state: AccountState, reason: string): void {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    account.setState(state, reason);
  }

  /**
   * Get entity manager
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * Verify account isolation
   * 
   * This method verifies that accounts are properly isolated.
   * Called during integrity checks.
   */
  verifyAccountIsolation(): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check that accounts have separate capital pools
    const accountIds = Array.from(this.accounts.keys());
    for (let i = 0; i < accountIds.length; i++) {
      for (let j = i + 1; j < accountIds.length; j++) {
        const account1 = this.accounts.get(accountIds[i])!;
        const account2 = this.accounts.get(accountIds[j])!;

        // Verify capital pools are separate instances
        if (account1.directionalPool === account2.directionalPool) {
          violations.push(`Accounts ${accountIds[i]} and ${accountIds[j]} share directional pool`);
        }
        if (account1.arbitragePool === account2.arbitragePool) {
          violations.push(`Accounts ${accountIds[i]} and ${accountIds[j]} share arbitrage pool`);
        }

        // Verify risk governors are separate instances
        if (account1.riskGovernor === account2.riskGovernor) {
          violations.push(`Accounts ${accountIds[i]} and ${accountIds[j]} share risk governor`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}

