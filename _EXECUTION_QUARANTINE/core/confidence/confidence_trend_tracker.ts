/**
 * Confidence Trend Tracker
 * 
 * PHASE 10: Confidence Accumulation & Coverage
 * 
 * Tracks confidence trends over time using rolling windows.
 * Identifies improving/degrading confidence patterns.
 * 
 * Design Principles:
 * - Rolling window analysis (deterministic)
 * - Time-series tracking
 * - Trend detection (improving/degrading/stable)
 * - Replayable (all data timestamped)
 */

import { MarketRegime } from '../regime_detector';
import { ShadowExecutionRecord } from '../shadow/shadow_execution_tracker';

export interface ConfidenceSnapshot {
  timestamp: Date;
  overallConfidence: number;
  confidenceByStrategy: Map<string, number>;
  confidenceByRegime: Map<MarketRegime, number>;
  totalTrades: number;
}

export interface ConfidenceTrend {
  period: {
    start: Date;
    end: Date;
    durationDays: number;
  };
  snapshots: ConfidenceSnapshot[];
  trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  trendStrength: number; // 0-1, how strong the trend is
  averageConfidence: number;
  confidenceChange: number; // Change from start to end
  confidenceChangePct: number;
}

export interface TrendAnalysis {
  currentTrend: ConfidenceTrend;
  recentTrends: ConfidenceTrend[]; // Last N rolling windows
  overallTrend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  trendConfidence: number; // 0-1, confidence in trend direction
}

/**
 * Confidence Trend Tracker
 * 
 * Tracks confidence over time using rolling windows.
 * Analyzes trends to detect improving/degrading patterns.
 */
export class ConfidenceTrendTracker {
  private snapshots: ConfidenceSnapshot[] = [];
  private rollingWindowDays: number = 7; // 7-day rolling window
  private minSnapshotsForTrend: number = 3; // Minimum snapshots to detect trend

  constructor(config?: {
    rollingWindowDays?: number;
    minSnapshotsForTrend?: number;
  }) {
    if (config?.rollingWindowDays !== undefined) {
      this.rollingWindowDays = config.rollingWindowDays;
    }
    if (config?.minSnapshotsForTrend !== undefined) {
      this.minSnapshotsForTrend = config.minSnapshotsForTrend;
    }
  }

  /**
   * Add a confidence snapshot
   * 
   * Called periodically (e.g., daily) to track confidence over time.
   */
  addSnapshot(snapshot: ConfidenceSnapshot): void {
    this.snapshots.push(snapshot);
    
    // Keep snapshots sorted by timestamp
    this.snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Remove old snapshots (keep last N days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (this.rollingWindowDays * 2));
    this.snapshots = this.snapshots.filter(s => s.timestamp >= cutoffDate);
  }

  /**
   * Analyze trends
   * 
   * Returns current trend and recent trends using rolling windows.
   */
  analyzeTrends(): TrendAnalysis {
    if (this.snapshots.length < this.minSnapshotsForTrend) {
      // Not enough data for trend analysis
      return {
        currentTrend: this.createEmptyTrend(),
        recentTrends: [],
        overallTrend: 'STABLE',
        trendConfidence: 0
      };
    }

    // Get current rolling window
    const currentTrend = this.calculateRollingTrend(
      this.snapshots,
      this.rollingWindowDays
    );

    // Get recent trends (last 3 windows)
    const recentTrends: ConfidenceTrend[] = [];
    for (let i = 0; i < 3; i++) {
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - (this.rollingWindowDays * (i + 1)));
      const windowEnd = new Date();
      windowEnd.setDate(windowEnd.getDate() - (this.rollingWindowDays * i));
      
      const windowSnapshots = this.snapshots.filter(
        s => s.timestamp >= windowStart && s.timestamp <= windowEnd
      );
      
      if (windowSnapshots.length >= this.minSnapshotsForTrend) {
        const trend = this.calculateTrendFromSnapshots(windowSnapshots);
        recentTrends.push(trend);
      }
    }

    // Determine overall trend
    const overallTrend = this.determineOverallTrend(currentTrend, recentTrends);
    const trendConfidence = this.calculateTrendConfidence(currentTrend, recentTrends);

    return {
      currentTrend,
      recentTrends,
      overallTrend,
      trendConfidence
    };
  }

  /**
   * Calculate rolling trend for a time period
   */
  private calculateRollingTrend(
    snapshots: ConfidenceSnapshot[],
    windowDays: number
  ): ConfidenceTrend {
    const now = new Date();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);
    
    const windowSnapshots = snapshots.filter(
      s => s.timestamp >= windowStart && s.timestamp <= now
    );

    return this.calculateTrendFromSnapshots(windowSnapshots);
  }

  /**
   * Calculate trend from snapshots
   */
  private calculateTrendFromSnapshots(snapshots: ConfidenceSnapshot[]): ConfidenceTrend {
    if (snapshots.length === 0) {
      return this.createEmptyTrend();
    }

    const start = snapshots[0].timestamp;
    const end = snapshots[snapshots.length - 1].timestamp;
    const durationMs = end.getTime() - start.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);

    const startConfidence = snapshots[0].overallConfidence;
    const endConfidence = snapshots[snapshots.length - 1].overallConfidence;
    const confidenceChange = endConfidence - startConfidence;
    const confidenceChangePct = startConfidence > 0
      ? (confidenceChange / startConfidence) * 100
      : 0;

    const averageConfidence = this.average(snapshots.map(s => s.overallConfidence));

    // Determine trend direction
    let trend: 'IMPROVING' | 'DEGRADING' | 'STABLE' = 'STABLE';
    const trendThreshold = 2; // 2% change threshold
    if (confidenceChangePct > trendThreshold) {
      trend = 'IMPROVING';
    } else if (confidenceChangePct < -trendThreshold) {
      trend = 'DEGRADING';
    }

    // Calculate trend strength (0-1)
    // Stronger if change is larger and consistent
    const trendStrength = Math.min(1, Math.abs(confidenceChangePct) / 10); // Normalize to 0-1

    return {
      period: {
        start,
        end,
        durationDays
      },
      snapshots,
      trend,
      trendStrength,
      averageConfidence,
      confidenceChange,
      confidenceChangePct
    };
  }

  /**
   * Determine overall trend from current and recent trends
   */
  private determineOverallTrend(
    currentTrend: ConfidenceTrend,
    recentTrends: ConfidenceTrend[]
  ): 'IMPROVING' | 'DEGRADING' | 'STABLE' {
    // Count trend directions
    let improving = 0;
    let degrading = 0;
    let stable = 0;

    if (currentTrend.trend === 'IMPROVING') improving++;
    else if (currentTrend.trend === 'DEGRADING') degrading++;
    else stable++;

    for (const trend of recentTrends) {
      if (trend.trend === 'IMPROVING') improving++;
      else if (trend.trend === 'DEGRADING') degrading++;
      else stable++;
    }

    // Determine overall trend
    if (improving > degrading && improving > stable) {
      return 'IMPROVING';
    } else if (degrading > improving && degrading > stable) {
      return 'DEGRADING';
    } else {
      return 'STABLE';
    }
  }

  /**
   * Calculate confidence in trend direction
   */
  private calculateTrendConfidence(
    currentTrend: ConfidenceTrend,
    recentTrends: ConfidenceTrend[]
  ): number {
    // Average trend strength across all windows
    const allTrends = [currentTrend, ...recentTrends];
    const avgTrendStrength = this.average(allTrends.map(t => t.trendStrength));
    
    // Higher confidence if trends are consistent
    const consistentTrends = allTrends.filter(
      t => t.trend === currentTrend.trend
    ).length;
    const consistencyScore = consistentTrends / Math.max(1, allTrends.length);
    
    // Combine trend strength and consistency
    return (avgTrendStrength * 0.6) + (consistencyScore * 0.4);
  }

  /**
   * Create empty trend (no data)
   */
  private createEmptyTrend(): ConfidenceTrend {
    const now = new Date();
    return {
      period: {
        start: now,
        end: now,
        durationDays: 0
      },
      snapshots: [],
      trend: 'STABLE',
      trendStrength: 0,
      averageConfidence: 0,
      confidenceChange: 0,
      confidenceChangePct: 0
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): ReadonlyArray<ConfidenceSnapshot> {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots (for testing/reset)
   */
  clear(): void {
    this.snapshots = [];
  }
}
