/**
 * Fail-Safe Shutdown Logic
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * System automatically triggers shutdown if critical failures occur.
 * Shutdown behavior: block all new trades, persist final state, emit CRITICAL alert.
 */

import { EventLog, EventType } from '../observability/event_log';
import { SystemHealthMonitor } from './system_health';
import { ModeController } from '../mode_controller';
import { RiskGovernor } from '../../src/services/riskGovernor';

export type FailSafeTrigger =
  | 'MARKET_DATA_STALL'
  | 'EVENT_LOG_WRITE_FAIL'
  | 'SNAPSHOT_WRITE_FAIL'
  | 'CAPITAL_INCONSISTENCY'
  | 'UNRECOVERABLE_EXCEPTION'
  | 'HEARTBEAT_LOSS'
  | 'HEALTH_CHECK_FAIL';

export interface FailSafeState {
  triggered: boolean;
  trigger: FailSafeTrigger | null;
  timestamp: Date | null;
  reason: string;
  persisted: boolean;
}

/**
 * Fail-Safe Manager
 * 
 * Monitors for critical failures and triggers safe shutdown.
 */
export class FailSafeManager {
  private eventLog: EventLog;
  private healthMonitor: SystemHealthMonitor;
  private modeController: ModeController;
  private riskGovernor: RiskGovernor;
  private state: FailSafeState;
  private onShutdownCallback?: () => void;

  constructor(
    eventLog: EventLog,
    healthMonitor: SystemHealthMonitor,
    modeController: ModeController,
    riskGovernor: RiskGovernor
  ) {
    this.eventLog = eventLog;
    this.healthMonitor = healthMonitor;
    this.modeController = modeController;
    this.riskGovernor = riskGovernor;
    this.state = {
      triggered: false,
      trigger: null,
      timestamp: null,
      reason: '',
      persisted: false
    };
  }

  /**
   * Check for fail-safe conditions and trigger shutdown if needed
   */
  checkFailSafeConditions(): void {
    if (this.state.triggered) {
      return; // Already in shutdown
    }

    // Check market data feed stall
    if (this.checkMarketDataStall()) {
      this.triggerShutdown('MARKET_DATA_STALL', 'Market data feed stalled');
      return;
    }

    // Check event log write failure
    if (this.checkEventLogWriteFailure()) {
      this.triggerShutdown('EVENT_LOG_WRITE_FAIL', 'Event log write failures detected');
      return;
    }

    // Check snapshot write failure
    if (this.checkSnapshotWriteFailure()) {
      this.triggerShutdown('SNAPSHOT_WRITE_FAIL', 'Snapshot write failures detected');
      return;
    }

    // Check system health
    const health = this.healthMonitor.getSystemHealth();
    if (!health.healthy) {
      this.triggerShutdown('HEALTH_CHECK_FAIL', 'System health check failed');
      return;
    }
  }

  /**
   * Trigger fail-safe shutdown
   */
  triggerShutdown(trigger: FailSafeTrigger, reason: string): void {
    if (this.state.triggered) {
      return; // Already in shutdown
    }

    console.error(`[FAILSAFE] 🚨 CRITICAL: Triggering shutdown - ${trigger}: ${reason}`);

    this.state = {
      triggered: true,
      trigger,
      timestamp: new Date(),
      reason,
      persisted: false
    };

    // Log shutdown event
    try {
      this.eventLog.append({
        eventType: EventType.SYSTEM_MODE_CHANGE,
        reason: `Fail-safe shutdown triggered: ${trigger} - ${reason}`,
        metadata: {
          failsafe: true,
          trigger,
          reason
        }
      });
    } catch (error) {
      console.error('[FAILSAFE] Failed to log shutdown event:', error);
    }

    // Enter SHUTDOWN state
    this.riskGovernor.setState('SHUTDOWN', `Fail-safe: ${reason}`);

    // Switch to OBSERVE_ONLY mode
    this.modeController.setMode('OBSERVE_ONLY', `Fail-safe: ${reason}`);

    // Persist final state
    this.persistFinalState();

    // Emit CRITICAL alert
    if (this.onShutdownCallback) {
      this.onShutdownCallback();
    }
  }

  /**
   * Check if market data feed has stalled
   */
  private checkMarketDataStall(): boolean {
    const health = this.healthMonitor.getSystemHealth();
    
    if (!health.lastMarketDataUpdate) {
      // No market data updates yet - not a stall
      return false;
    }

    const now = new Date();
    const age = now.getTime() - health.lastMarketDataUpdate.getTime();
    const stallThreshold = 10 * 60 * 1000; // 10 minutes

    return age > stallThreshold;
  }

  /**
   * Check if event log writes are failing
   */
  private checkEventLogWriteFailure(): boolean {
    const health = this.healthMonitor.getSystemHealth();
    
    if (!health.lastEventLogWrite) {
      // No event log writes yet - not a failure
      return false;
    }

    const now = new Date();
    const age = now.getTime() - health.lastEventLogWrite.getTime();
    const failureThreshold = 15 * 60 * 1000; // 15 minutes

    return age > failureThreshold;
  }

  /**
   * Check if snapshot writes are failing
   */
  private checkSnapshotWriteFailure(): boolean {
    const health = this.healthMonitor.getSystemHealth();
    
    // Snapshot writes are daily, so we check if it's been more than 25 hours
    // since last snapshot (allowing 1 hour buffer)
    if (!health.lastSnapshotWrite) {
      return false; // No snapshots yet - not a failure
    }

    const now = new Date();
    const age = now.getTime() - health.lastSnapshotWrite.getTime();
    const failureThreshold = 25 * 60 * 60 * 1000; // 25 hours

    return age > failureThreshold;
  }

  /**
   * Persist final state before shutdown
   */
  private persistFinalState(): void {
    try {
      // Log final state
      this.eventLog.append({
        eventType: EventType.SYSTEM_MODE_CHANGE,
        reason: 'Final state persisted before shutdown',
        metadata: {
          mode: this.modeController.getMode(),
          riskState: this.riskGovernor.getRiskState(),
          health: this.healthMonitor.getSystemHealth()
        }
      });

      this.state.persisted = true;
      console.log('[FAILSAFE] Final state persisted');
    } catch (error) {
      console.error('[FAILSAFE] Failed to persist final state:', error);
    }
  }

  /**
   * Check if system is in fail-safe shutdown
   */
  isInShutdown(): boolean {
    return this.state.triggered;
  }

  /**
   * Get fail-safe state
   */
  getFailSafeState(): Readonly<FailSafeState> {
    return { ...this.state };
  }

  /**
   * Set shutdown callback
   */
  setOnShutdownCallback(callback: () => void): void {
    this.onShutdownCallback = callback;
  }

  /**
   * Reset fail-safe state (for testing/recovery)
   */
  reset(): void {
    this.state = {
      triggered: false,
      trigger: null,
      timestamp: null,
      reason: '',
      persisted: false
    };
  }
}

