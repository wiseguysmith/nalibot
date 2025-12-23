/**
 * Data Integrity Verification
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Verifies data integrity for:
 * - Event log sequence continuity
 * - Snapshot monotonicity
 * - Capital pool reconciliation
 * - Strategy state consistency
 * 
 * Violations block execution and require manual intervention.
 */

import { EventLog } from '../observability/event_log';
import { DailySnapshotGenerator } from '../observability/daily_snapshot';
import { CapitalPool } from '../capital/capital_pool';
import { StrategyCapitalAccountManager } from '../capital/strategy_capital_account';

export interface IntegrityViolation {
  type: 'EVENT_LOG' | 'SNAPSHOT' | 'CAPITAL' | 'STRATEGY';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  timestamp: Date;
}

/**
 * Data Integrity Verifier
 * 
 * Verifies data integrity and reports violations.
 */
export class DataIntegrityVerifier {
  private violations: IntegrityViolation[] = [];

  /**
   * Verify event log sequence continuity
   */
  verifyEventLogIntegrity(eventLog: EventLog): boolean {
    try {
      const events = eventLog.getAllEvents();
      
      // Check for duplicate event IDs
      const eventIds = new Set<string>();
      for (const event of events) {
        if (eventIds.has(event.eventId)) {
          this.recordViolation({
            type: 'EVENT_LOG',
            severity: 'CRITICAL',
            description: `Duplicate event ID: ${event.eventId}`,
            timestamp: new Date()
          });
          return false;
        }
        eventIds.add(event.eventId);
      }

      // Check timestamp monotonicity (events should be in chronological order)
      for (let i = 1; i < events.length; i++) {
        if (events[i].timestamp < events[i - 1].timestamp) {
          this.recordViolation({
            type: 'EVENT_LOG',
            severity: 'WARNING',
            description: `Event timestamp out of order: ${events[i].eventId}`,
            timestamp: new Date()
          });
        }
      }

      return true;
    } catch (error: any) {
      this.recordViolation({
        type: 'EVENT_LOG',
        severity: 'CRITICAL',
        description: `Event log integrity check failed: ${error.message}`,
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Verify snapshot monotonicity
   */
  verifySnapshotMonotonicity(snapshotGenerator: DailySnapshotGenerator): boolean {
    try {
      const snapshots = snapshotGenerator.getAllSnapshots();
      
      if (snapshots.length === 0) {
        return true; // No snapshots to verify
      }

      // Check dates are unique
      const dates = new Set<string>();
      for (const snapshot of snapshots) {
        if (dates.has(snapshot.date)) {
          this.recordViolation({
            type: 'SNAPSHOT',
            severity: 'CRITICAL',
            description: `Duplicate snapshot date: ${snapshot.date}`,
            timestamp: new Date()
          });
          return false;
        }
        dates.add(snapshot.date);
      }

      // Check chronological order
      const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].date);
        const curr = new Date(sorted[i].date);
        
        if (curr < prev) {
          this.recordViolation({
            type: 'SNAPSHOT',
            severity: 'CRITICAL',
            description: `Snapshot out of order: ${sorted[i].date} < ${sorted[i - 1].date}`,
            timestamp: new Date()
          });
          return false;
        }
      }

      return true;
    } catch (error: any) {
      this.recordViolation({
        type: 'SNAPSHOT',
        severity: 'CRITICAL',
        description: `Snapshot monotonicity check failed: ${error.message}`,
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Verify capital pool reconciliation
   */
  verifyCapitalPoolReconciliation(
    directionalPool: CapitalPool,
    arbitragePool: CapitalPool,
    accountManager: StrategyCapitalAccountManager
  ): boolean {
    try {
      const directionalMetrics = directionalPool.getMetrics();
      const arbitrageMetrics = arbitragePool.getMetrics();
      const accounts = accountManager.getAllAccounts();

      // Sum allocated capital from accounts
      let totalAllocated = 0;
      accounts.forEach(account => {
        totalAllocated += account.allocatedCapital;
      });

      // Sum allocated capital from pools
      const poolAllocated = directionalMetrics.allocatedCapital + arbitrageMetrics.allocatedCapital;

      // Check reconciliation
      const difference = Math.abs(totalAllocated - poolAllocated);
      if (difference > 0.01) { // $0.01 tolerance
        this.recordViolation({
          type: 'CAPITAL',
          severity: 'CRITICAL',
          description: `Capital reconciliation failed: Accounts=${totalAllocated.toFixed(2)}, Pools=${poolAllocated.toFixed(2)}, Diff=${difference.toFixed(2)}`,
          timestamp: new Date()
        });
        return false;
      }

      return true;
    } catch (error: any) {
      this.recordViolation({
        type: 'CAPITAL',
        severity: 'CRITICAL',
        description: `Capital pool reconciliation check failed: ${error.message}`,
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Verify strategy state consistency
   */
  verifyStrategyStateConsistency(accountManager: StrategyCapitalAccountManager): boolean {
    try {
      const accounts = accountManager.getAllAccounts();
      const validStates = ['DISABLED', 'SIM', 'ACTIVE', 'PROBATION', 'PAUSED'];
      
      for (const account of accounts) {
        if (!validStates.includes(account.state)) {
          this.recordViolation({
            type: 'STRATEGY',
            severity: 'CRITICAL',
            description: `Invalid strategy state: ${account.strategyId} = ${account.state}`,
            timestamp: new Date()
          });
          return false;
        }
      }

      return true;
    } catch (error: any) {
      this.recordViolation({
        type: 'STRATEGY',
        severity: 'CRITICAL',
        description: `Strategy state consistency check failed: ${error.message}`,
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Run all integrity checks
   */
  runAllChecks(
    eventLog: EventLog,
    snapshotGenerator: DailySnapshotGenerator | null,
    directionalPool: CapitalPool | null,
    arbitragePool: CapitalPool | null,
    accountManager: StrategyCapitalAccountManager | null
  ): boolean {
    let allPassed = true;

    // Check event log
    if (!this.verifyEventLogIntegrity(eventLog)) {
      allPassed = false;
    }

    // Check snapshots
    if (snapshotGenerator) {
      if (!this.verifySnapshotMonotonicity(snapshotGenerator)) {
        allPassed = false;
      }
    }

    // Check capital pools
    if (directionalPool && arbitragePool && accountManager) {
      if (!this.verifyCapitalPoolReconciliation(directionalPool, arbitragePool, accountManager)) {
        allPassed = false;
      }
    }

    // Check strategy states
    if (accountManager) {
      if (!this.verifyStrategyStateConsistency(accountManager)) {
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * Record integrity violation
   */
  private recordViolation(violation: IntegrityViolation): void {
    this.violations.push(violation);
    console.error(`[DATA_INTEGRITY] ${violation.severity}: ${violation.type} - ${violation.description}`);
  }

  /**
   * Get all violations
   */
  getViolations(): ReadonlyArray<IntegrityViolation> {
    return [...this.violations];
  }

  /**
   * Get critical violations
   */
  getCriticalViolations(): ReadonlyArray<IntegrityViolation> {
    return this.violations.filter(v => v.severity === 'CRITICAL');
  }

  /**
   * Clear violations (for testing)
   */
  clearViolations(): void {
    this.violations = [];
  }
}

