/**
 * Alert Manager
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Minimal, meaningful alerting.
 * Alerts ONLY for critical events that require attention.
 * 
 * No alerts for:
 * - Normal blocked trades
 * - Regime mismatches
 * - Expected inactivity
 */

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export interface Alert {
  alertId: string;
  timestamp: Date;
  severity: AlertSeverity;
  title: string;
  message: string;
  rootCause: string;
  recommendedAction: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
}

/**
 * Alert Manager
 * 
 * Manages alerts for critical system events.
 */
export class AlertManager {
  private alerts: Alert[] = [];
  private maxAlerts: number = 1000; // Prevent unbounded growth
  private onAlertCallback?: (alert: Alert) => void;

  /**
   * Create and emit an alert
   */
  alert(
    severity: AlertSeverity,
    title: string,
    message: string,
    rootCause: string,
    recommendedAction: string,
    metadata?: Record<string, any>
  ): string {
    const alert: Alert = {
      alertId: this.generateAlertId(),
      timestamp: new Date(),
      severity,
      title,
      message,
      rootCause,
      recommendedAction,
      metadata,
      acknowledged: false
    };

    this.alerts.push(alert);

    // Prevent unbounded growth
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Emit alert
    console.error(`[ALERT] ${severity}: ${title} - ${message}`);
    
    if (this.onAlertCallback) {
      this.onAlertCallback(alert);
    }

    return alert.alertId;
  }

  /**
   * Alert for shutdown events
   */
  alertShutdown(trigger: string, reason: string): string {
    return this.alert(
      AlertSeverity.CRITICAL,
      'System Shutdown',
      `System entered SHUTDOWN state: ${trigger}`,
      reason,
      'Review system logs and restart manually after resolving issue',
      { trigger, reason }
    );
  }

  /**
   * Alert for fail-safe triggers
   */
  alertFailSafe(trigger: string, reason: string): string {
    return this.alert(
      AlertSeverity.CRITICAL,
      'Fail-Safe Triggered',
      `Fail-safe mechanism activated: ${trigger}`,
      reason,
      'System is in safe mode. Review logs and resolve issue before resuming trading',
      { trigger, reason }
    );
  }

  /**
   * Alert for startup failures
   */
  alertStartupFailure(failures: string[]): string {
    return this.alert(
      AlertSeverity.CRITICAL,
      'Startup Checks Failed',
      `System started in OBSERVE_ONLY mode due to startup check failures`,
      failures.join('; '),
      'Review startup check failures and resolve before enabling trading',
      { failures }
    );
  }

  /**
   * Alert for heartbeat loss
   */
  alertHeartbeatLoss(durationSeconds: number): string {
    return this.alert(
      AlertSeverity.CRITICAL,
      'Heartbeat Lost',
      `System heartbeat missing for ${durationSeconds}s`,
      'System may be unresponsive or crashed',
      'Check system status and restart if necessary',
      { durationSeconds }
    );
  }

  /**
   * Alert for capital integrity violations
   */
  alertCapitalIntegrityViolation(description: string): string {
    return this.alert(
      AlertSeverity.CRITICAL,
      'Capital Integrity Violation',
      `Capital pool reconciliation failed: ${description}`,
      'Capital allocation mismatch detected',
      'Review capital allocation and reconcile manually',
      { description }
    );
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): ReadonlyArray<Alert> {
    return [...this.alerts];
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): ReadonlyArray<Alert> {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): ReadonlyArray<Alert> {
    return this.alerts.filter(a => a.severity === AlertSeverity.CRITICAL);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Set alert callback
   */
  setOnAlertCallback(callback: (alert: Alert) => void): void {
    this.onAlertCallback = callback;
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `alert_${timestamp}_${random}`;
  }
}

