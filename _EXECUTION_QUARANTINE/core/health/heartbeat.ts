/**
 * Heartbeat & Liveness Monitor
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Implements periodic heartbeat events and liveness monitoring.
 * Missing heartbeat beyond threshold → system enters SAFE MODE.
 */

import { EventLog, EventType } from '../observability/event_log';
import { SystemHealthMonitor } from './system_health';

export interface HeartbeatConfig {
  intervalMs: number; // Heartbeat interval (default: 30 seconds)
  thresholdMs: number; // Missing heartbeat threshold (default: 2 minutes)
  safeModeOnMiss: boolean; // Enter safe mode on missed heartbeat (default: true)
}

/**
 * Heartbeat Monitor
 * 
 * Monitors system liveness through periodic heartbeats.
 */
export class HeartbeatMonitor {
  private eventLog: EventLog;
  private healthMonitor: SystemHealthMonitor;
  private config: HeartbeatConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: Date | null = null;
  private isRunning: boolean = false;
  private onSafeModeCallback?: () => void;

  constructor(
    eventLog: EventLog,
    healthMonitor: SystemHealthMonitor,
    config?: Partial<HeartbeatConfig>
  ) {
    this.eventLog = eventLog;
    this.healthMonitor = healthMonitor;
    this.config = {
      intervalMs: 30000, // 30 seconds
      thresholdMs: 120000, // 2 minutes
      safeModeOnMiss: true,
      ...config
    };
  }

  /**
   * Start heartbeat monitoring
   */
  start(onSafeMode?: () => void): void {
    if (this.isRunning) {
      return;
    }

    this.onSafeModeCallback = onSafeMode;
    this.isRunning = true;
    this.lastHeartbeat = new Date();

    // Send initial heartbeat
    this.sendHeartbeat();

    // Start periodic heartbeats
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.checkLiveness();
    }, this.config.intervalMs);

    console.log(`[HEARTBEAT] Started monitoring (interval: ${this.config.intervalMs}ms)`);
  }

  /**
   * Stop heartbeat monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    console.log('[HEARTBEAT] Stopped monitoring');
  }

  /**
   * Send heartbeat event
   */
  private sendHeartbeat(): void {
    if (!this.isRunning) {
      return;
    }

    try {
      this.eventLog.append({
        eventType: EventType.SYSTEM_MODE_CHANGE,
        reason: 'Heartbeat - system alive',
        metadata: {
          heartbeat: true,
          uptime: this.healthMonitor.getUptimeString()
        }
      } as any); // Using SYSTEM_MODE_CHANGE as closest match for heartbeat

      this.lastHeartbeat = new Date();
      this.healthMonitor.updateEventLogWriteTimestamp();
    } catch (error) {
      console.error('[HEARTBEAT] Failed to write heartbeat:', error);
      this.healthMonitor.recordError();
    }
  }

  /**
   * Check liveness and trigger safe mode if needed
   */
  private checkLiveness(): void {
    if (!this.lastHeartbeat) {
      return;
    }

    const now = new Date();
    const timeSinceLastHeartbeat = now.getTime() - this.lastHeartbeat.getTime();

    if (timeSinceLastHeartbeat > this.config.thresholdMs) {
      console.error(
        `[HEARTBEAT] 🚨 CRITICAL: Missing heartbeat for ${Math.round(timeSinceLastHeartbeat / 1000)}s ` +
        `(threshold: ${this.config.thresholdMs / 1000}s)`
      );

      if (this.config.safeModeOnMiss && this.onSafeModeCallback) {
        console.error('[HEARTBEAT] 🚨 Entering SAFE MODE due to heartbeat loss');
        this.onSafeModeCallback();
      }
    }
  }

  /**
   * Get last heartbeat timestamp
   */
  getLastHeartbeat(): Date | null {
    return this.lastHeartbeat;
  }

  /**
   * Check if heartbeat is alive
   */
  isAlive(): boolean {
    if (!this.lastHeartbeat) {
      return false;
    }

    const now = new Date();
    const timeSinceLastHeartbeat = now.getTime() - this.lastHeartbeat.getTime();
    return timeSinceLastHeartbeat <= this.config.thresholdMs;
  }

  /**
   * Get time since last heartbeat
   */
  getTimeSinceLastHeartbeat(): number {
    if (!this.lastHeartbeat) {
      return Infinity;
    }

    return new Date().getTime() - this.lastHeartbeat.getTime();
  }
}

