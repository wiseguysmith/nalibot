/**
 * Control Plane - Mode Controller
 * 
 * Central authority for system mode management.
 * Determines what the system is allowed to do based on current mode.
 * 
 * PHASE 1: Governance & Survival
 * This module enforces mode-based permissions that cannot be bypassed.
 */

export type SystemMode = 'AGGRESSIVE' | 'OBSERVE_ONLY';
// Conservative mode exists conceptually but is disabled for now

export interface ModePermissions {
  tradingAllowed: boolean;
  maxRiskPctPerTrade: number;
  maxLeverage: number;
  allowedStrategyTypes: string[];
}

/**
 * Mode Controller
 * 
 * Maintains the current system mode and exposes read-only permissions.
 * Mode switching must be explicit and centralized.
 * No strategy may override mode permissions.
 */
export class ModeController {
  private currentMode: SystemMode;
  private modeHistory: Array<{ mode: SystemMode; timestamp: Date; reason?: string }> = [];

  constructor(initialMode: SystemMode = 'OBSERVE_ONLY') {
    this.currentMode = initialMode;
    this.modeHistory.push({
      mode: initialMode,
      timestamp: new Date(),
      reason: 'System initialization'
    });
  }

  /**
   * Get the current system mode
   */
  getMode(): SystemMode {
    return this.currentMode;
  }

  /**
   * Get permissions based on current mode
   * 
   * OBSERVE_ONLY → tradingAllowed = false
   * AGGRESSIVE → tradingAllowed = true (subject to risk governor)
   */
  getPermissions(): ModePermissions {
    switch (this.currentMode) {
      case 'OBSERVE_ONLY':
        return {
          tradingAllowed: false,
          maxRiskPctPerTrade: 0,
          maxLeverage: 0,
          allowedStrategyTypes: [] // Strategies may run but cannot deploy capital
        };

      case 'AGGRESSIVE':
        return {
          tradingAllowed: true,
          maxRiskPctPerTrade: 30, // 30% max risk per trade
          maxLeverage: 1, // No leverage in Phase 1
          allowedStrategyTypes: ['volatility', 'statistical_arb', 'funding_arb'] // All approved strategy types
        };

      default:
        // Fail-safe: default to OBSERVE_ONLY if unknown mode
        return {
          tradingAllowed: false,
          maxRiskPctPerTrade: 0,
          maxLeverage: 0,
          allowedStrategyTypes: []
        };
    }
  }

  /**
   * Set the system mode
   * 
   * Mode switching must be explicit and centralized.
   * All mode changes are logged immutably.
   */
  setMode(mode: SystemMode, reason?: string): void {
    if (mode === this.currentMode) {
      return; // No change
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;
    
    this.modeHistory.push({
      mode,
      timestamp: new Date(),
      reason: reason || `Mode changed from ${previousMode}`
    });

    console.log(`[MODE_CONTROLLER] Mode changed: ${previousMode} → ${mode}${reason ? ` (${reason})` : ''}`);
  }

  /**
   * Get mode change history
   * Useful for auditing and debugging
   */
  getModeHistory(): ReadonlyArray<{ mode: SystemMode; timestamp: Date; reason?: string }> {
    return [...this.modeHistory];
  }

  /**
   * Check if trading is allowed in current mode
   * Fast O(1) check for permission gate
   */
  isTradingAllowed(): boolean {
    return this.getPermissions().tradingAllowed;
  }
}

