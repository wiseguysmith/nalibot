/**
 * Shadow Execution Tracker
 * 
 * PHASE 9: Shadow Trading & Execution Parity
 * 
 * Tracks simulated execution results and observes real market outcomes
 * to measure divergence between simulated and observed reality.
 */

import { TradeRequest, TradeResult } from '../../src/services/riskGovernor';
import { ShadowConfig, DEFAULT_SHADOW_CONFIG } from './shadow_config';
import { ParityMetricsEngine, ParityMetrics } from './parity_metrics';
import { ObservabilityHooks } from '../observability/observability_integration';
import { ParitySummaryGenerator, ParitySummary } from './parity_summary';
import { MarketRegime } from '../regime_detector';

export interface ObservedMarketSnapshot {
  timestamp: Date;
  price: number;
  bid: number;
  ask: number;
  volume?: number;
}

export interface ShadowExecutionRecord {
  request: TradeRequest;
  simulatedResult: TradeResult;
  decisionTimestamp: Date;
  observedSnapshots: ObservedMarketSnapshot[];
  parityMetrics?: ParityMetrics;
  regime?: MarketRegime; // PHASE 10: Regime at decision time
  regimeConfidence?: number; // PHASE 10: Regime detection confidence
}

/**
 * Shadow Execution Tracker
 * 
 * Captures:
 * - Simulated execution results
 * - Observed market prices at decision time
 * - Observed market prices at decision + latency
 * - Short horizon prices after decision
 * 
 * Computes execution deltas and forwards to parity metrics engine.
 */
export class ShadowExecutionTracker {
  private config: ShadowConfig;
  private parityMetricsEngine: ParityMetricsEngine;
  private paritySummaryGenerator: ParitySummaryGenerator;
  private activeTrackings: Map<string, NodeJS.Timeout> = new Map();
  private shadowRecords: Map<string, ShadowExecutionRecord> = new Map();
  private marketDataService?: any; // MarketDataService for real-time data
  public observabilityHooks?: ObservabilityHooks; // Public so it can be set after construction

  constructor(
    config: Partial<ShadowConfig> = {},
    marketDataService?: any,
    observabilityHooks?: ObservabilityHooks
  ) {
    this.config = { ...DEFAULT_SHADOW_CONFIG, ...config };
    this.marketDataService = marketDataService;
    this.observabilityHooks = observabilityHooks;
    this.parityMetricsEngine = new ParityMetricsEngine();
    this.paritySummaryGenerator = new ParitySummaryGenerator();
  }

  /**
   * Start tracking a shadow execution
   * 
   * Records simulated execution and begins observing real market outcomes.
   * 
   * PHASE 10: Now accepts regime information for confidence accumulation.
   */
  async trackShadowExecution(
    request: TradeRequest,
    simulatedResult: TradeResult,
    decisionTimestamp: Date,
    regime?: MarketRegime,
    regimeConfidence?: number
  ): Promise<string> {
    const trackingId = `SHADOW_${decisionTimestamp.getTime()}_${request.pair}_${request.strategy}`;

    // Create initial record
    const record: ShadowExecutionRecord = {
      request,
      simulatedResult,
      decisionTimestamp,
      observedSnapshots: [],
      regime, // PHASE 10: Store regime information
      regimeConfidence // PHASE 10: Store regime confidence
    };

    // Capture initial market snapshot (at decision time)
    const initialSnapshot = await this.captureMarketSnapshot(request.pair);
    if (initialSnapshot) {
      record.observedSnapshots.push(initialSnapshot);
    }

    // Capture snapshot at latency reference time
    setTimeout(async () => {
      const latencySnapshot = await this.captureMarketSnapshot(request.pair);
      if (latencySnapshot) {
        record.observedSnapshots.push(latencySnapshot);
      }
    }, this.config.latencyReferenceMs);

    this.shadowRecords.set(trackingId, record);

    // Log shadow trade evaluated event (will be updated with latency snapshot)
    if (this.observabilityHooks && initialSnapshot) {
      this.observabilityHooks.logShadowTradeEvaluated(
        request,
        simulatedResult,
        initialSnapshot.price,
        initialSnapshot.price, // Will be updated when latency snapshot arrives
        trackingId,
        'SHADOW'
      );
    }

    // Start observation window
    this.startObservationWindow(trackingId, request.pair);

    return trackingId;
  }

  /**
   * Capture current market snapshot
   * 
   * Uses CoinbaseMarketDataService to fetch real market prices.
   */
  private async captureMarketSnapshot(pair: string): Promise<ObservedMarketSnapshot | null> {
    try {
      // Get real market data from CoinbaseMarketDataService
      if (this.marketDataService) {
        // Try cached data first (synchronous) - CoinbaseMarketDataService has getCachedMarketData
        let marketData = (this.marketDataService as any).getCachedMarketData?.(pair);
        
        // If not cached, fetch fresh data (async)
        if (!marketData) {
          marketData = await (this.marketDataService as any).getMarketData?.(pair);
        }
        
        if (marketData) {
          // CoinbaseMarketDataService returns CoinbaseMarketData interface:
          // { price: number, bid: number, ask: number, volume?: number, timestamp: Date }
          return {
            timestamp: marketData.timestamp instanceof Date 
              ? marketData.timestamp 
              : new Date(marketData.timestamp || Date.now()),
            price: marketData.price || 0,
            bid: marketData.bid || marketData.price || 0,
            ask: marketData.ask || marketData.price || 0,
            volume: marketData.volume
          };
        }
      }

      // No market data available
      console.warn(`[SHADOW_TRACKER] No market data available for ${pair} - market data service may not be initialized`);
      return null;
    } catch (error) {
      console.error(`[SHADOW_TRACKER] Failed to capture market snapshot for ${pair}:`, error);
      return null;
    }
  }

  /**
   * Start observation window
   * 
   * Samples market prices at regular intervals during observation window.
   */
  private startObservationWindow(trackingId: string, pair: string): void {
    const record = this.shadowRecords.get(trackingId);
    if (!record) {
      return;
    }

    let elapsedMs = 0;
    const samplingInterval = setInterval(async () => {
      elapsedMs += this.config.priceSamplingIntervalMs;

      // Capture snapshot
      const snapshot = await this.captureMarketSnapshot(pair);
      if (snapshot) {
        record.observedSnapshots.push(snapshot);
      }

      // Check if observation window is complete
      if (elapsedMs >= this.config.observationWindowMs) {
        clearInterval(samplingInterval);
        this.activeTrackings.delete(trackingId);
        
        // Compute parity metrics
        await this.computeParityMetrics(trackingId);
      }
    }, this.config.priceSamplingIntervalMs);

    this.activeTrackings.set(trackingId, samplingInterval);
  }

  /**
   * Compute parity metrics for a completed shadow execution
   */
  private async computeParityMetrics(trackingId: string): Promise<void> {
    const record = this.shadowRecords.get(trackingId);
    if (!record || record.observedSnapshots.length === 0) {
      return;
    }

    // Find snapshots at key timestamps
    const decisionSnapshot = record.observedSnapshots[0];
    const latencyTimestamp = new Date(
      record.decisionTimestamp.getTime() + this.config.latencyReferenceMs
    );
    const latencySnapshot = this.findSnapshotAtTime(record.observedSnapshots, latencyTimestamp);
    const finalSnapshot = record.observedSnapshots[record.observedSnapshots.length - 1];

    // Compute parity metrics
    const metrics = this.parityMetricsEngine.computeMetrics(
      record.request,
      record.simulatedResult,
      decisionSnapshot,
      latencySnapshot || decisionSnapshot,
      finalSnapshot
    );

    record.parityMetrics = metrics;

    // Log parity metric event
    if (this.observabilityHooks) {
      const latencyPrice = latencySnapshot?.price || decisionSnapshot.price;
      this.observabilityHooks.logShadowTradeEvaluated(
        record.request,
        record.simulatedResult,
        decisionSnapshot.price,
        latencyPrice,
        trackingId,
        'SHADOW'
      );
      this.observabilityHooks.logShadowParityMetric(
        record.request.strategy,
        record.request.pair,
        trackingId,
        metrics
      );
    }
  }

  /**
   * Find snapshot closest to a given timestamp
   */
  private findSnapshotAtTime(
    snapshots: ObservedMarketSnapshot[],
    targetTime: Date
  ): ObservedMarketSnapshot | null {
    if (snapshots.length === 0) {
      return null;
    }

    let closest = snapshots[0];
    let minDiff = Math.abs(closest.timestamp.getTime() - targetTime.getTime());

    for (const snapshot of snapshots) {
      const diff = Math.abs(snapshot.timestamp.getTime() - targetTime.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }

    return closest;
  }

  /**
   * Get shadow execution record
   */
  getShadowRecord(trackingId: string): ShadowExecutionRecord | undefined {
    return this.shadowRecords.get(trackingId);
  }

  /**
   * Get all shadow records
   */
  getAllShadowRecords(): ShadowExecutionRecord[] {
    return Array.from(this.shadowRecords.values());
  }

  /**
   * Get shadow records for a specific pair
   */
  getShadowRecordsForPair(pair: string): ShadowExecutionRecord[] {
    return Array.from(this.shadowRecords.values()).filter(
      record => record.request.pair === pair
    );
  }

  /**
   * Generate parity summary from all completed shadow records
   */
  generateParitySummary(): ParitySummary {
    const allRecords = Array.from(this.shadowRecords.values());
    return this.paritySummaryGenerator.generateSummary(
      allRecords,
      this.config.observationWindowMs
    );
  }
  
  /**
   * Export parity summary as JSON
   */
  exportParitySummaryAsJSON(): string {
    const summary = this.generateParitySummary();
    return this.paritySummaryGenerator.exportAsJSON(summary);
  }
  
  /**
   * Export parity summary as text report
   */
  exportParitySummaryAsText(): string {
    const summary = this.generateParitySummary();
    return this.paritySummaryGenerator.exportAsText(summary);
  }

  /**
   * Cleanup completed trackings
   */
  cleanup(): void {
    // Clear all active intervals
    for (const interval of this.activeTrackings.values()) {
      clearInterval(interval);
    }
    this.activeTrackings.clear();
  }
}

