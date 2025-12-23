/**
 * System Health Monitor
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Tracks and exposes system health metrics.
 * Health status must be deterministic, cheap to compute, and read-only.
 */

export interface HealthStatus {
  healthy: boolean;
  uptime: number; // Process uptime in milliseconds
  lastMarketDataUpdate: Date | null;
  lastEventLogWrite: Date | null;
  lastSnapshotWrite: Date | null;
  executionQueueStatus: 'IDLE' | 'PROCESSING' | 'STALLED';
  memoryUsage: {
    heapUsed: number; // MB
    heapTotal: number; // MB
    rss: number; // MB
  };
  errorRate: number; // Errors per minute (rolling window)
  timestamp: Date;
}

export interface HealthMetrics {
  startTime: Date;
  lastMarketDataUpdate: Date | null;
  lastEventLogWrite: Date | null;
  lastSnapshotWrite: Date | null;
  executionQueueStatus: 'IDLE' | 'PROCESSING' | 'STALLED';
  errorCount: number;
  errorTimestamps: Date[];
}

/**
 * System Health Monitor
 * 
 * Monitors system health and exposes status.
 */
export class SystemHealthMonitor {
  private metrics: HealthMetrics;
  private readonly errorWindowMinutes: number = 5; // Rolling window for error rate

  constructor() {
    this.metrics = {
      startTime: new Date(),
      lastMarketDataUpdate: null,
      lastEventLogWrite: null,
      lastSnapshotWrite: null,
      executionQueueStatus: 'IDLE',
      errorCount: 0,
      errorTimestamps: []
    };
  }

  /**
   * Get current system health status
   * 
   * Deterministic, cheap to compute, read-only.
   */
  getSystemHealth(): HealthStatus {
    const now = new Date();
    const uptime = now.getTime() - this.metrics.startTime.getTime();

    // Calculate error rate (errors per minute in rolling window)
    const windowStart = new Date(now.getTime() - this.errorWindowMinutes * 60 * 1000);
    const recentErrors = this.metrics.errorTimestamps.filter(
      ts => ts >= windowStart
    ).length;
    const errorRate = recentErrors / this.errorWindowMinutes;

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryMB = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    };

    // Determine if system is healthy
    const healthy = this.isHealthy(now, errorRate);

    return {
      healthy,
      uptime,
      lastMarketDataUpdate: this.metrics.lastMarketDataUpdate,
      lastEventLogWrite: this.metrics.lastEventLogWrite,
      lastSnapshotWrite: this.metrics.lastSnapshotWrite,
      executionQueueStatus: this.metrics.executionQueueStatus,
      memoryUsage: memoryMB,
      errorRate,
      timestamp: now
    };
  }

  /**
   * Check if system is healthy
   */
  private isHealthy(now: Date, errorRate: number): boolean {
    // System is unhealthy if:
    // 1. Error rate too high (> 10 errors per minute)
    if (errorRate > 10) {
      return false;
    }

    // 2. Market data stale (> 5 minutes old)
    if (this.metrics.lastMarketDataUpdate) {
      const marketDataAge = now.getTime() - this.metrics.lastMarketDataUpdate.getTime();
      if (marketDataAge > 5 * 60 * 1000) { // 5 minutes
        return false;
      }
    }

    // 3. Event log write stale (> 10 minutes old)
    if (this.metrics.lastEventLogWrite) {
      const eventLogAge = now.getTime() - this.metrics.lastEventLogWrite.getTime();
      if (eventLogAge > 10 * 60 * 1000) { // 10 minutes
        return false;
      }
    }

    // 4. Execution queue stalled
    if (this.metrics.executionQueueStatus === 'STALLED') {
      return false;
    }

    return true;
  }

  /**
   * Update market data timestamp
   */
  updateMarketDataTimestamp(): void {
    this.metrics.lastMarketDataUpdate = new Date();
  }

  /**
   * Update event log write timestamp
   */
  updateEventLogWriteTimestamp(): void {
    this.metrics.lastEventLogWrite = new Date();
  }

  /**
   * Update snapshot write timestamp
   */
  updateSnapshotWriteTimestamp(): void {
    this.metrics.lastSnapshotWrite = new Date();
  }

  /**
   * Update execution queue status
   */
  updateExecutionQueueStatus(status: 'IDLE' | 'PROCESSING' | 'STALLED'): void {
    this.metrics.executionQueueStatus = status;
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.metrics.errorCount++;
    this.metrics.errorTimestamps.push(new Date());

    // Keep only errors in rolling window
    const windowStart = new Date(
      new Date().getTime() - this.errorWindowMinutes * 60 * 1000
    );
    this.metrics.errorTimestamps = this.metrics.errorTimestamps.filter(
      ts => ts >= windowStart
    );
  }

  /**
   * Get uptime in human-readable format
   */
  getUptimeString(): string {
    const uptime = this.getSystemHealth().uptime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

