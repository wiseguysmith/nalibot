/**
 * Daily Immutable Snapshots
 * 
 * PHASE 4: Observability, Attribution & Replay
 * 
 * At end of each trading day, persist an immutable snapshot.
 * Snapshots are append-only and used for investor reporting.
 * 
 * Rules:
 * - Snapshots are immutable
 * - One snapshot per day
 * - Stored append-only
 * - Used for investor reporting
 */

import { EventLog, EventType } from './event_log';
import { CapitalPoolMetrics } from '../capital/capital_pool';

export interface DailySnapshot {
  snapshotId: string;
  date: string; // YYYY-MM-DD format
  timestamp: Date;
  
  // System state
  systemMode: string;
  riskState: string;
  
  // Equity metrics
  totalSystemEquity: number;
  directionalPoolEquity: number;
  arbitragePoolEquity: number;
  
  // Per-strategy PnL
  strategyPnL: Map<string, number>;
  
  // Drawdowns
  systemDrawdown: number;
  directionalPoolDrawdown: number;
  arbitragePoolDrawdown: number;
  strategyDrawdowns: Map<string, number>;
  
  // Regime distribution
  regimeDistribution: {
    FAVORABLE: number;
    UNFAVORABLE: number;
    UNKNOWN: number;
  };
  
  // Trade statistics
  tradesAttempted: number;
  tradesBlocked: number;
  tradesExecuted: number;
  
  // Blocking reasons breakdown
  blockingReasons: {
    CAPITAL: number;
    REGIME: number;
    PERMISSION: number;
    RISK: number;
  };
  
  // Capital allocation summary
  capitalAllocation: Map<string, number>;
  
  // Event summary
  totalEvents: number;
  eventTypes: Map<EventType, number>;
}

/**
 * Daily Snapshot Generator
 * 
 * Generates immutable snapshots at end of trading day.
 */
export class DailySnapshotGenerator {
  private snapshots: DailySnapshot[] = [];

  /**
   * Generate snapshot for a specific day
   */
  generateSnapshot(
    date: Date,
    eventLog: EventLog,
    systemMode: string,
    riskState: string,
    directionalPoolMetrics: CapitalPoolMetrics,
    arbitragePoolMetrics: CapitalPoolMetrics,
    strategyPnL: Map<string, number>,
    strategyDrawdowns: Map<string, number>,
    capitalAllocation: Map<string, number>
  ): DailySnapshot {
    const dateStr = this.formatDate(date);
    const events = eventLog.getEventsForDay(date);

    // Calculate regime distribution
    const regimeEvents = events.filter(
      e => e.eventType === EventType.REGIME_DETECTED
    );
    const regimeDistribution = this.calculateRegimeDistribution(regimeEvents);

    // Calculate trade statistics
    const tradeStats = this.calculateTradeStats(events);

    // Calculate blocking reasons
    const blockingReasons = this.calculateBlockingReasons(events);

    // Count event types
    const eventTypes = this.countEventTypes(events);

    const snapshot: DailySnapshot = {
      snapshotId: this.generateSnapshotId(dateStr),
      date: dateStr,
      timestamp: new Date(),
      
      systemMode,
      riskState,
      
      totalSystemEquity: directionalPoolMetrics.totalCapital + arbitragePoolMetrics.totalCapital,
      directionalPoolEquity: directionalPoolMetrics.totalCapital,
      arbitragePoolEquity: arbitragePoolMetrics.totalCapital,
      
      strategyPnL: new Map(strategyPnL),
      
      systemDrawdown: Math.max(
        directionalPoolMetrics.currentDrawdown,
        arbitragePoolMetrics.currentDrawdown
      ),
      directionalPoolDrawdown: directionalPoolMetrics.currentDrawdown,
      arbitragePoolDrawdown: arbitragePoolMetrics.currentDrawdown,
      strategyDrawdowns: new Map(strategyDrawdowns),
      
      regimeDistribution,
      
      tradesAttempted: tradeStats.attempted,
      tradesBlocked: tradeStats.blocked,
      tradesExecuted: tradeStats.executed,
      
      blockingReasons,
      
      capitalAllocation: new Map(capitalAllocation),
      
      totalEvents: events.length,
      eventTypes
    };

    // Append snapshot (immutable)
    this.snapshots.push(snapshot);

    return snapshot;
  }

  /**
   * Get snapshot for a specific date
   */
  getSnapshot(date: string): DailySnapshot | undefined {
    return this.snapshots.find(s => s.date === date);
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): ReadonlyArray<DailySnapshot> {
    return [...this.snapshots];
  }

  /**
   * Get snapshots in date range
   */
  getSnapshotsInRange(startDate: string, endDate: string): ReadonlyArray<DailySnapshot> {
    return this.snapshots.filter(
      s => s.date >= startDate && s.date <= endDate
    );
  }

  /**
   * Get most recent snapshot
   */
  getMostRecentSnapshot(): DailySnapshot | undefined {
    return this.snapshots.length > 0 
      ? this.snapshots[this.snapshots.length - 1]
      : undefined;
  }

  /**
   * Calculate regime distribution from events
   */
  private calculateRegimeDistribution(regimeEvents: any[]): {
    FAVORABLE: number;
    UNFAVORABLE: number;
    UNKNOWN: number;
  } {
    const distribution = {
      FAVORABLE: 0,
      UNFAVORABLE: 0,
      UNKNOWN: 0
    };

    regimeEvents.forEach(event => {
      if (event.regime === 'FAVORABLE') distribution.FAVORABLE++;
      else if (event.regime === 'UNFAVORABLE') distribution.UNFAVORABLE++;
      else distribution.UNKNOWN++;
    });

    return distribution;
  }

  /**
   * Calculate trade statistics from events
   */
  private calculateTradeStats(events: any[]): {
    attempted: number;
    blocked: number;
    executed: number;
  } {
    const attempted = events.filter(
      e => e.eventType === EventType.TRADE_EXECUTED || e.eventType === EventType.TRADE_BLOCKED
    ).length;
    
    const blocked = events.filter(
      e => e.eventType === EventType.TRADE_BLOCKED
    ).length;
    
    const executed = events.filter(
      e => e.eventType === EventType.TRADE_EXECUTED
    ).length;

    return { attempted, blocked, executed };
  }

  /**
   * Calculate blocking reasons breakdown
   */
  private calculateBlockingReasons(events: any[]): {
    CAPITAL: number;
    REGIME: number;
    PERMISSION: number;
    RISK: number;
  } {
    const reasons = {
      CAPITAL: 0,
      REGIME: 0,
      PERMISSION: 0,
      RISK: 0
    };

    events
      .filter(e => e.eventType === EventType.TRADE_BLOCKED)
      .forEach(event => {
        if (event.blockingLayer === 'CAPITAL') reasons.CAPITAL++;
        else if (event.blockingLayer === 'REGIME') reasons.REGIME++;
        else if (event.blockingLayer === 'PERMISSION') reasons.PERMISSION++;
        else if (event.blockingLayer === 'RISK') reasons.RISK++;
      });

    return reasons;
  }

  /**
   * Count event types
   */
  private countEventTypes(events: any[]): Map<EventType, number> {
    const counts = new Map<EventType, number>();

    events.forEach(event => {
      const current = counts.get(event.eventType) || 0;
      counts.set(event.eventType, current + 1);
    });

    return counts;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generate snapshot ID
   */
  private generateSnapshotId(dateStr: string): string {
    return `snapshot_${dateStr}`;
  }
}

