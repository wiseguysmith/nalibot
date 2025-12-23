/**
 * Runtime Tracker
 * 
 * VALIDATION MODE: Tracks active trading days for confidence gate enforcement.
 * 
 * An "active trading day" is a day where at least one trade was executed
 * (SIMULATED, SHADOW, or SENTINEL - but not REAL during validation).
 * 
 * Design Principles:
 * - Deterministic tracking (no randomness)
 * - Replayable (can reconstruct from event log)
 * - Tracks calendar days, not runtime hours
 */

export interface RuntimeMetrics {
  startDate: Date;
  lastActiveDate: Date;
  activeTradingDays: number;
  totalCalendarDays: number;
  daysWithTrades: Set<string>; // YYYY-MM-DD format
}

/**
 * Runtime Tracker
 * 
 * Tracks active trading days by recording days when trades were executed.
 * Used for confidence gate enforcement (requires ≥ 100 active trading days).
 */
export class RuntimeTracker {
  private startDate: Date;
  private daysWithTrades: Set<string> = new Set(); // YYYY-MM-DD format
  private lastActiveDate?: Date;

  constructor(startDate?: Date) {
    this.startDate = startDate || new Date();
  }

  /**
   * Record a trade execution (marks the day as active)
   * 
   * Call this whenever a trade is executed (SIMULATED, SHADOW, or SENTINEL).
   */
  recordTradeExecution(timestamp: Date): void {
    const dateStr = this.getDateString(timestamp);
    this.daysWithTrades.add(dateStr);
    
    if (!this.lastActiveDate || timestamp > this.lastActiveDate) {
      this.lastActiveDate = timestamp;
    }
  }

  /**
   * Get active trading days count
   * 
   * Returns the number of distinct days where trades were executed.
   */
  getActiveTradingDays(): number {
    return this.daysWithTrades.size;
  }

  /**
   * Get total calendar days since start
   */
  getTotalCalendarDays(): number {
    const now = new Date();
    const msDiff = now.getTime() - this.startDate.getTime();
    return Math.floor(msDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get runtime metrics
   */
  getMetrics(): RuntimeMetrics {
    return {
      startDate: this.startDate,
      lastActiveDate: this.lastActiveDate || this.startDate,
      activeTradingDays: this.daysWithTrades.size,
      totalCalendarDays: this.getTotalCalendarDays(),
      daysWithTrades: new Set(this.daysWithTrades)
    };
  }

  /**
   * Convert date to YYYY-MM-DD string
   */
  private getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Load from persisted data (for replayability)
   */
  loadFromData(data: RuntimeMetrics): void {
    this.startDate = new Date(data.startDate);
    this.daysWithTrades = new Set(data.daysWithTrades);
    this.lastActiveDate = data.lastActiveDate ? new Date(data.lastActiveDate) : undefined;
  }

  /**
   * Export data for persistence
   */
  exportData(): RuntimeMetrics {
    return this.getMetrics();
  }
}
