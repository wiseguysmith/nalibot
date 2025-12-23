/**
 * Pre-Trade Permission Gate
 * 
 * Single point of authorization between signal generation and trade execution.
 * Combines Mode Controller permissions and Risk Governor approval.
 * 
 * PHASE 1: Governance & Survival
 * This gate ensures no trade can execute without explicit permission.
 * Permission checks must be fast (O(1)), deterministic, and in-memory.
 */

import { ModeController, ModePermissions } from './mode_controller';
import { RiskGovernor, TradeRequest } from '../services/riskGovernor';

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  source: 'MODE_CONTROLLER' | 'RISK_GOVERNOR' | 'APPROVED';
}

/**
 * Permission Gate
 * 
 * Combines Mode Controller permissions and Risk Governor approval.
 * Returns a single boolean decision.
 * 
 * Rules:
 * - Permission checks must be fast and deterministic
 * - No network calls
 * - No side effects
 * - If permission is denied → execution must not occur
 */
export class PermissionGate {
  private modeController: ModeController;
  private riskGovernor: RiskGovernor;

  constructor(modeController: ModeController, riskGovernor: RiskGovernor) {
    this.modeController = modeController;
    this.riskGovernor = riskGovernor;
  }

  /**
   * Check if a trade request is permitted
   * 
   * Execution flow:
   * 1. Check Mode Controller permissions (O(1))
   * 2. Check Risk Governor approval (O(1))
   * 3. Return combined decision
   * 
   * @param request Trade request to evaluate
   * @returns Permission result with reason if denied
   */
  checkPermission(request: TradeRequest): PermissionResult {
    // Step 1: Check Mode Controller permissions
    const modePermissions = this.modeController.getPermissions();
    
    if (!modePermissions.tradingAllowed) {
      return {
        allowed: false,
        reason: `Trading not allowed in ${this.modeController.getMode()} mode`,
        source: 'MODE_CONTROLLER'
      };
    }

    // Step 2: Check if strategy type is allowed
    // For Phase 1, we'll allow all strategies if trading is allowed
    // In Phase 2, we'll add strategy type checking based on regime
    
    // Step 3: Check Risk Governor approval
    const riskApproved = this.riskGovernor.approveTrade(request);
    
    if (!riskApproved) {
      const riskState = this.riskGovernor.getRiskState();
      return {
        allowed: false,
        reason: `Risk Governor denied: System state is ${riskState}`,
        source: 'RISK_GOVERNOR'
      };
    }

    // Step 4: Check position size against mode limits
    const maxRiskPct = modePermissions.maxRiskPctPerTrade;
    // Note: We'd need portfolio value here for full check, but for Phase 1
    // we rely on Risk Governor's position size check
    
    // All checks passed
    return {
      allowed: true,
      source: 'APPROVED'
    };
  }

  /**
   * Fast O(1) check for whether trading is allowed at all
   * 
   * Useful for strategies to check before generating signals.
   * This is a quick check that doesn't require a full trade request.
   */
  isTradingAllowed(): boolean {
    return this.modeController.isTradingAllowed() && 
           this.riskGovernor.getRiskState() !== 'SHUTDOWN' &&
           this.riskGovernor.getRiskState() !== 'PAUSED';
  }

  /**
   * Get current permission status summary
   * 
   * Useful for dashboards and monitoring (Phase 4)
   */
  getPermissionStatus(): {
    mode: string;
    riskState: string;
    tradingAllowed: boolean;
    modePermissions: ModePermissions;
  } {
    return {
      mode: this.modeController.getMode(),
      riskState: this.riskGovernor.getRiskState(),
      tradingAllowed: this.isTradingAllowed(),
      modePermissions: this.modeController.getPermissions()
    };
  }
}

/**
 * Convenience function for permission checking
 * 
 * This is the main entry point for permission checks.
 * All execution paths should call this function before executing trades.
 */
export function permissionGate(
  request: TradeRequest,
  modeController: ModeController,
  riskGovernor: RiskGovernor
): PermissionResult {
  const gate = new PermissionGate(modeController, riskGovernor);
  return gate.checkPermission(request);
}

