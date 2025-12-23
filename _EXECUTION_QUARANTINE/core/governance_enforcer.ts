/**
 * Governance Enforcer
 * 
 * CRITICAL: This module provides enforcement wrappers to ensure
 * existing execution paths cannot bypass governance.
 * 
 * PHASE 1: Governance & Survival
 * 
 * This is a temporary enforcement layer until all execution paths
 * are refactored to use ExecutionManager directly.
 */

import { GovernanceSystem, createTradeRequest } from './governance_integration';
import { TradeRequest } from '../src/services/riskGovernor';

/**
 * Governance Enforcer Wrapper
 * 
 * Wraps exchange clients to enforce governance on all order placement.
 * This ensures no order can be placed without going through the permission gate.
 */
export class GovernanceEnforcer {
  private governance: GovernanceSystem;
  private wrappedClient: any;

  constructor(governance: GovernanceSystem, exchangeClient: any) {
    this.governance = governance;
    this.wrappedClient = exchangeClient;
  }

  /**
   * Enforced placeBuyOrder - ALL buy orders must go through governance
   */
  async placeBuyOrder(pair: string, quantity: number, price: number, strategy: string = 'unknown'): Promise<any> {
    const request = createTradeRequest({
      strategy,
      pair,
      action: 'buy',
      amount: quantity,
      price
    });

    // CRITICAL: Must go through ExecutionManager
    const result = await this.governance.executionManager.executeTrade(request);
    
    if (!result.success) {
      return {
        success: false,
        error: `Governance blocked trade: ${result.pair}`,
        orderId: null
      };
    }

    // If we have an exchange client and we're in AGGRESSIVE mode, execute
    if (this.wrappedClient && this.governance.modeController.getMode() === 'AGGRESSIVE') {
      try {
        return await this.wrappedClient.placeBuyOrder(pair, quantity, price);
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          orderId: null
        };
      }
    }

    // Otherwise return simulated result
    return {
      success: true,
      orderId: `gov_${Date.now()}`,
      price,
      quantity
    };
  }

  /**
   * Enforced placeSellOrder - ALL sell orders must go through governance
   */
  async placeSellOrder(pair: string, quantity: number, price: number, strategy: string = 'unknown'): Promise<any> {
    const request = createTradeRequest({
      strategy,
      pair,
      action: 'sell',
      amount: quantity,
      price
    });

    // CRITICAL: Must go through ExecutionManager
    const result = await this.governance.executionManager.executeTrade(request);
    
    if (!result.success) {
      return {
        success: false,
        error: `Governance blocked trade: ${result.pair}`,
        orderId: null
      };
    }

    // If we have an exchange client and we're in AGGRESSIVE mode, execute
    if (this.wrappedClient && this.governance.modeController.getMode() === 'AGGRESSIVE') {
      try {
        return await this.wrappedClient.placeSellOrder(pair, quantity, price);
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          orderId: null
        };
      }
    }

    // Otherwise return simulated result
    return {
      success: true,
      orderId: `gov_${Date.now()}`,
      price,
      quantity
    };
  }

  /**
   * Enforced addOrder - ALL orders must go through governance
   */
  async addOrder(params: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: string;
    volume: string;
  }, strategy: string = 'unknown'): Promise<any> {
    // Extract price from params or use market price
    const quantity = parseFloat(params.volume);
    const price = 0; // Will need to be fetched from market data
    
    const request = createTradeRequest({
      strategy,
      pair: params.pair,
      action: params.type,
      amount: quantity,
      price // Note: Should fetch actual price
    });

    // CRITICAL: Must go through ExecutionManager
    const result = await this.governance.executionManager.executeTrade(request);
    
    if (!result.success) {
      return {
        error: [`Governance blocked trade: ${result.pair}`],
        result: {}
      };
    }

    // If we have an exchange client and we're in AGGRESSIVE mode, execute
    if (this.wrappedClient && this.governance.modeController.getMode() === 'AGGRESSIVE') {
      try {
        return await this.wrappedClient.addOrder(params);
      } catch (error: any) {
        return {
          error: [error.message],
          result: {}
        };
      }
    }

    // Otherwise return simulated result
    return {
      error: [],
      result: {
        txid: [`gov_${Date.now()}`]
      }
    };
  }

  /**
   * Delegate all other methods to wrapped client
   */
  async getTicker(pair: string): Promise<any> {
    return this.wrappedClient?.getTicker?.(pair);
  }

  async getBalance(): Promise<any> {
    return this.wrappedClient?.getBalance?.();
  }

  async getTickerInformation(pairs: string[]): Promise<any> {
    return this.wrappedClient?.getTickerInformation?.(pairs);
  }
}

/**
 * Create a governance-enforced exchange client wrapper
 * 
 * Use this to wrap existing exchange clients and enforce governance.
 */
export function createGovernedExchangeClient(
  governance: GovernanceSystem,
  exchangeClient: any
): GovernanceEnforcer {
  return new GovernanceEnforcer(governance, exchangeClient);
}

