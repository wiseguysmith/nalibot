/**
 * Regime Coverage Tracker
 * 
 * PHASE 10: Confidence Accumulation & Coverage
 * 
 * Tracks shadow trade coverage across all market regimes.
 * Enforces minimum sample thresholds per regime.
 * 
 * Design Principles:
 * - Deterministic tracking (no randomness)
 * - Explicit coverage requirements
 * - Replayable (all data can be reconstructed)
 */

import { MarketRegime } from '../regime_detector';
import { ShadowExecutionRecord } from '../shadow/shadow_execution_tracker';

export interface RegimeCoverage {
  regime: MarketRegime;
  totalTrades: number;
  tradesWithMetrics: number;
  minimumRequired: number;
  coveragePercentage: number;
  isCovered: boolean;
  lastTradeTimestamp?: Date;
  firstTradeTimestamp?: Date;
}

export interface RegimeCoverageSummary {
  totalTrades: number;
  coverageByRegime: Map<MarketRegime, RegimeCoverage>;
  allRegimesCovered: boolean;
  overallCoveragePercentage: number;
  minimumRequiredPerRegime: number;
}

/**
 * Regime Coverage Tracker
 * 
 * Tracks how many shadow trades have been executed in each regime.
 * Enforces minimum sample thresholds before allowing real capital.
 */
export class RegimeCoverageTracker {
  private minimumRequiredPerRegime: number;
  private shadowRecords: ShadowExecutionRecord[] = [];
  private regimeMap: Map<string, MarketRegime> = new Map(); // trackingId -> regime

  constructor(minimumRequiredPerRegime: number = 167) {
    // Default: 500 total trades / 3 regimes ≈ 167 per regime
    // This ensures balanced coverage across all regimes
    this.minimumRequiredPerRegime = minimumRequiredPerRegime;
  }

  /**
   * Register a shadow trade with its regime
   * 
   * Called when a shadow trade is executed and its regime is known.
   */
  registerTrade(trackingId: string, regime: MarketRegime, record: ShadowExecutionRecord): void {
    this.regimeMap.set(trackingId, regime);
    
    // Find or create record
    const existingIndex = this.shadowRecords.findIndex(
      r => this.getTrackingId(r) === trackingId
    );
    
    if (existingIndex >= 0) {
      this.shadowRecords[existingIndex] = record;
    } else {
      this.shadowRecords.push(record);
    }
  }

  /**
   * Get coverage summary
   */
  getCoverageSummary(): RegimeCoverageSummary {
    const coverageByRegime = new Map<MarketRegime, RegimeCoverage>();
    
    // Initialize coverage for all regimes
    for (const regime of [MarketRegime.FAVORABLE, MarketRegime.UNFAVORABLE, MarketRegime.UNKNOWN]) {
      coverageByRegime.set(regime, {
        regime,
        totalTrades: 0,
        tradesWithMetrics: 0,
        minimumRequired: this.minimumRequiredPerRegime,
        coveragePercentage: 0,
        isCovered: false
      });
    }

    // Count trades per regime
    for (const record of this.shadowRecords) {
      const trackingId = this.getTrackingId(record);
      const regime = this.regimeMap.get(trackingId) || MarketRegime.UNKNOWN;
      
      const coverage = coverageByRegime.get(regime)!;
      coverage.totalTrades++;
      
      if (record.parityMetrics) {
        coverage.tradesWithMetrics++;
      }
      
      // Track timestamps
      if (!coverage.firstTradeTimestamp || record.decisionTimestamp < coverage.firstTradeTimestamp) {
        coverage.firstTradeTimestamp = record.decisionTimestamp;
      }
      if (!coverage.lastTradeTimestamp || record.decisionTimestamp > coverage.lastTradeTimestamp) {
        coverage.lastTradeTimestamp = record.decisionTimestamp;
      }
    }

    // Calculate coverage percentages and status
    let allCovered = true;
    for (const coverage of coverageByRegime.values()) {
      coverage.coveragePercentage = coverage.minimumRequired > 0
        ? (coverage.tradesWithMetrics / coverage.minimumRequired) * 100
        : 0;
      coverage.isCovered = coverage.tradesWithMetrics >= coverage.minimumRequired;
      
      if (!coverage.isCovered) {
        allCovered = false;
      }
    }

    // Calculate overall coverage
    const totalTrades = this.shadowRecords.length;
    const totalRequired = this.minimumRequiredPerRegime * 3; // 3 regimes
    const overallCoveragePercentage = totalRequired > 0
      ? (totalTrades / totalRequired) * 100
      : 0;

    return {
      totalTrades,
      coverageByRegime,
      allRegimesCovered: allCovered,
      overallCoveragePercentage,
      minimumRequiredPerRegime: this.minimumRequiredPerRegime
    };
  }

  /**
   * Get coverage for a specific regime
   */
  getRegimeCoverage(regime: MarketRegime): RegimeCoverage {
    const summary = this.getCoverageSummary();
    return summary.coverageByRegime.get(regime) || {
      regime,
      totalTrades: 0,
      tradesWithMetrics: 0,
      minimumRequired: this.minimumRequiredPerRegime,
      coveragePercentage: 0,
      isCovered: false
    };
  }

  /**
   * Check if all regimes meet minimum requirements
   */
  isFullyCovered(): boolean {
    return this.getCoverageSummary().allRegimesCovered;
  }

  /**
   * Get list of regimes that need more trades
   */
  getUnderCoveredRegimes(): MarketRegime[] {
    const summary = this.getCoverageSummary();
    const underCovered: MarketRegime[] = [];
    
    for (const [regime, coverage] of summary.coverageByRegime) {
      if (!coverage.isCovered) {
        underCovered.push(regime);
      }
    }
    
    return underCovered;
  }

  /**
   * Get all shadow records for a specific regime
   */
  getRecordsForRegime(regime: MarketRegime): ShadowExecutionRecord[] {
    return this.shadowRecords.filter(record => {
      const trackingId = this.getTrackingId(record);
      return this.regimeMap.get(trackingId) === regime;
    });
  }

  /**
   * Get all registered shadow records
   */
  getAllRecords(): ShadowExecutionRecord[] {
    return [...this.shadowRecords];
  }

  /**
   * Extract tracking ID from record
   * 
   * Helper to generate consistent tracking IDs from records.
   */
  private getTrackingId(record: ShadowExecutionRecord): string {
    // Generate tracking ID from record properties
    return `SHADOW_${record.decisionTimestamp.getTime()}_${record.request.pair}_${record.request.strategy}`;
  }

  /**
   * Clear all records (for testing/reset)
   */
  clear(): void {
    this.shadowRecords = [];
    this.regimeMap.clear();
  }

  /**
   * Get total trade count
   */
  getTotalTradeCount(): number {
    return this.shadowRecords.length;
  }

  /**
   * Get trade count for a specific regime
   */
  getTradeCountForRegime(regime: MarketRegime): number {
    return this.getRecordsForRegime(regime).length;
  }
}
