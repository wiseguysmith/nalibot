/**
 * Graceful Startup & Restart Checks
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * On startup, verify system integrity before allowing trading.
 * If any check fails, system starts in OBSERVE_ONLY mode.
 */

import { EventLog } from '../observability/event_log';
import { DailySnapshotGenerator } from '../observability/daily_snapshot';
import { CapitalPool } from '../capital/capital_pool';
import { StrategyCapitalAccountManager } from '../capital/strategy_capital_account';
import { ModeController } from '../mode_controller';
import { RiskGovernor } from '../../src/services/riskGovernor';

export interface StartupCheckResult {
  passed: boolean;
  checks: {
    eventLogIntegrity: boolean;
    snapshotConsistency: boolean;
    capitalPoolReconciliation: boolean;
    strategyStateConsistency: boolean;
    systemModeValid: boolean;
    adaptersReachable: boolean;
  };
  failures: string[];
  warnings: string[];
}

/**
 * Startup Checks
 * 
 * Validates system integrity on startup.
 */
export class StartupChecks {
  /**
   * Run all startup checks
   */
  async runAllChecks(
    eventLog: EventLog,
    snapshotGenerator: DailySnapshotGenerator | null,
    directionalPool: CapitalPool | null,
    arbitragePool: CapitalPool | null,
    accountManager: StrategyCapitalAccountManager | null,
    modeController: ModeController,
    riskGovernor: RiskGovernor,
    adapterPing?: () => Promise<boolean>
  ): Promise<StartupCheckResult> {
    const result: StartupCheckResult = {
      passed: true,
      checks: {
        eventLogIntegrity: false,
        snapshotConsistency: false,
        capitalPoolReconciliation: false,
        strategyStateConsistency: false,
        systemModeValid: false,
        adaptersReachable: false
      },
      failures: [],
      warnings: []
    };

    // Check 1: Event log integrity
    result.checks.eventLogIntegrity = this.checkEventLogIntegrity(eventLog);
    if (!result.checks.eventLogIntegrity) {
      result.failures.push('Event log integrity check failed');
      result.passed = false;
    }

    // Check 2: Snapshot consistency
    if (snapshotGenerator) {
      result.checks.snapshotConsistency = this.checkSnapshotConsistency(snapshotGenerator);
      if (!result.checks.snapshotConsistency) {
        result.warnings.push('Snapshot consistency check failed (non-critical)');
      }
    } else {
      result.checks.snapshotConsistency = true; // No snapshots to check
    }

    // Check 3: Capital pool reconciliation
    if (directionalPool && arbitragePool && accountManager) {
      result.checks.capitalPoolReconciliation = this.checkCapitalPoolReconciliation(
        directionalPool,
        arbitragePool,
        accountManager
      );
      if (!result.checks.capitalPoolReconciliation) {
        result.failures.push('Capital pool reconciliation failed');
        result.passed = false;
      }
    } else {
      result.checks.capitalPoolReconciliation = true; // Capital governance not enabled
    }

    // Check 4: Strategy state consistency
    if (accountManager) {
      result.checks.strategyStateConsistency = this.checkStrategyStateConsistency(accountManager);
      if (!result.checks.strategyStateConsistency) {
        result.warnings.push('Strategy state consistency check failed (non-critical)');
      }
    } else {
      result.checks.strategyStateConsistency = true; // No strategies to check
    }

    // Check 5: System mode valid
    result.checks.systemModeValid = this.checkSystemModeValid(modeController);
    if (!result.checks.systemModeValid) {
      result.failures.push('System mode invalid');
      result.passed = false;
    }

    // Check 6: Adapters reachable (read-only ping)
    if (adapterPing) {
      try {
        result.checks.adaptersReachable = await adapterPing();
        if (!result.checks.adaptersReachable) {
          result.warnings.push('Adapters not reachable (will start in OBSERVE_ONLY)');
        }
      } catch (error: any) {
        result.warnings.push(`Adapter ping failed: ${error.message}`);
        result.checks.adaptersReachable = false;
      }
    } else {
      result.checks.adaptersReachable = true; // No adapter ping function provided
    }

    return result;
  }

  /**
   * Check event log integrity
   */
  private checkEventLogIntegrity(eventLog: EventLog): boolean {
    try {
      const events = eventLog.getAllEvents();
      
      // Check for sequence continuity (event IDs should be unique)
      const eventIds = new Set<string>();
      for (const event of events) {
        if (eventIds.has(event.eventId)) {
          console.error('[STARTUP] Duplicate event ID found:', event.eventId);
          return false;
        }
        eventIds.add(event.eventId);
      }

      // Check timestamps are reasonable (not in future, not too old)
      const now = new Date();
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
      
      for (const event of events) {
        if (event.timestamp > now) {
          console.error('[STARTUP] Event timestamp in future:', event.eventId);
          return false;
        }
        if (now.getTime() - event.timestamp.getTime() > maxAge) {
          console.warn('[STARTUP] Very old event found:', event.eventId);
        }
      }

      return true;
    } catch (error) {
      console.error('[STARTUP] Event log integrity check failed:', error);
      return false;
    }
  }

  /**
   * Check snapshot consistency
   */
  private checkSnapshotConsistency(snapshotGenerator: DailySnapshotGenerator): boolean {
    try {
      const snapshots = snapshotGenerator.getAllSnapshots();
      
      // Check snapshot dates are unique
      const dates = new Set<string>();
      for (const snapshot of snapshots) {
        if (dates.has(snapshot.date)) {
          console.error('[STARTUP] Duplicate snapshot date:', snapshot.date);
          return false;
        }
        dates.add(snapshot.date);
      }

      // Check snapshots are in chronological order
      const sortedSnapshots = [...snapshots].sort((a, b) => 
        a.date.localeCompare(b.date)
      );
      
      for (let i = 1; i < sortedSnapshots.length; i++) {
        const prev = new Date(sortedSnapshots[i - 1].date);
        const curr = new Date(sortedSnapshots[i].date);
        const daysDiff = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
        
        if (daysDiff < 0) {
          console.error('[STARTUP] Snapshots out of order');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[STARTUP] Snapshot consistency check failed:', error);
      return false;
    }
  }

  /**
   * Check capital pool reconciliation
   */
  private checkCapitalPoolReconciliation(
    directionalPool: CapitalPool,
    arbitragePool: CapitalPool,
    accountManager: StrategyCapitalAccountManager
  ): boolean {
    try {
      const directionalMetrics = directionalPool.getMetrics();
      const arbitrageMetrics = arbitragePool.getMetrics();
      const accounts = accountManager.getAllAccounts();

      // Sum allocated capital from all accounts
      let totalAllocated = 0;
      accounts.forEach(account => {
        totalAllocated += account.allocatedCapital;
      });

      // Sum allocated capital from pools
      const poolAllocated = directionalMetrics.allocatedCapital + arbitrageMetrics.allocatedCapital;

      // Check reconciliation (allow small floating point differences)
      const difference = Math.abs(totalAllocated - poolAllocated);
      if (difference > 0.01) { // $0.01 tolerance
        console.error(
          `[STARTUP] Capital reconciliation failed: ` +
          `Accounts=${totalAllocated.toFixed(2)}, Pools=${poolAllocated.toFixed(2)}, Diff=${difference.toFixed(2)}`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('[STARTUP] Capital pool reconciliation check failed:', error);
      return false;
    }
  }

  /**
   * Check strategy state consistency
   */
  private checkStrategyStateConsistency(accountManager: StrategyCapitalAccountManager): boolean {
    try {
      const accounts = accountManager.getAllAccounts();
      
      // Check that accounts have valid states
      const validStates = ['DISABLED', 'SIM', 'ACTIVE', 'PROBATION', 'PAUSED'];
      
      for (const account of accounts) {
        if (!validStates.includes(account.state)) {
          console.error('[STARTUP] Invalid strategy state:', account.strategyId, account.state);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[STARTUP] Strategy state consistency check failed:', error);
      return false;
    }
  }

  /**
   * Check system mode is valid
   */
  private checkSystemModeValid(modeController: ModeController): boolean {
    try {
      const mode = modeController.getMode();
      const validModes = ['AGGRESSIVE', 'OBSERVE_ONLY'];
      
      if (!validModes.includes(mode)) {
        console.error('[STARTUP] Invalid system mode:', mode);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[STARTUP] System mode check failed:', error);
      return false;
    }
  }
}

