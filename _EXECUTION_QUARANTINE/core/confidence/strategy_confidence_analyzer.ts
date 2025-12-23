/**
 * Strategy Confidence Analyzer
 * 
 * PHASE 10: Confidence Accumulation & Coverage
 * 
 * Analyzes confidence metrics per strategy AND per regime.
 * Identifies unsafe strategy × regime combinations.
 * 
 * Design Principles:
 * - Per-strategy analysis
 * - Per-regime analysis
 * - Per strategy×regime combination analysis
 * - Deterministic metrics (no ML)
 * - Explicit unsafe combinations flagged
 */

import { MarketRegime } from '../regime_detector';
import { ShadowExecutionRecord } from '../shadow/shadow_execution_tracker';
import { ParityMetrics } from '../shadow/parity_metrics';

export interface StrategyConfidenceMetrics {
  strategyId: string;
  totalTrades: number;
  tradesWithMetrics: number;
  averageConfidenceScore: number;
  worstCaseConfidenceScore: number;
  confidenceScoreStdDev: number;
  isConfident: boolean; // >= 90% threshold
}

export interface RegimeConfidenceMetrics {
  regime: MarketRegime;
  totalTrades: number;
  tradesWithMetrics: number;
  averageConfidenceScore: number;
  worstCaseConfidenceScore: number;
  confidenceScoreStdDev: number;
  isConfident: boolean; // >= 90% threshold
}

export interface StrategyRegimeCombinationMetrics {
  strategyId: string;
  regime: MarketRegime;
  totalTrades: number;
  tradesWithMetrics: number;
  averageConfidenceScore: number;
  worstCaseConfidenceScore: number;
  confidenceScoreStdDev: number;
  isConfident: boolean; // >= 90% threshold
  isUnsafe: boolean; // Explicitly flagged as unsafe
  unsafeReason?: string;
}

export interface StrategyConfidenceAnalysis {
  strategies: Map<string, StrategyConfidenceMetrics>;
  regimes: Map<MarketRegime, RegimeConfidenceMetrics>;
  combinations: Map<string, StrategyRegimeCombinationMetrics>; // key: "strategyId:regime"
  unsafeCombinations: StrategyRegimeCombinationMetrics[];
  overallConfidenceScore: number;
}

/**
 * Strategy Confidence Analyzer
 * 
 * Analyzes confidence across strategies, regimes, and their combinations.
 * Identifies unsafe combinations explicitly.
 */
export class StrategyConfidenceAnalyzer {
  private confidenceThreshold: number = 90; // 90% confidence required
  private minimumTradesPerCombination: number = 10; // Minimum trades to assess combination

  constructor(config?: {
    confidenceThreshold?: number;
    minimumTradesPerCombination?: number;
  }) {
    if (config?.confidenceThreshold !== undefined) {
      this.confidenceThreshold = config.confidenceThreshold;
    }
    if (config?.minimumTradesPerCombination !== undefined) {
      this.minimumTradesPerCombination = config.minimumTradesPerCombination;
    }
  }

  /**
   * Analyze confidence from shadow records
   * 
   * Requires regime information for each record.
   */
  analyzeConfidence(
    records: ShadowExecutionRecord[],
    regimeMap: Map<string, MarketRegime>
  ): StrategyConfidenceAnalysis {
    // Compute confidence scores for each record
    const recordsWithScores = records
      .map(record => ({
        record,
        confidenceScore: this.computeConfidenceScore(record),
        regime: regimeMap.get(this.getTrackingId(record)) || MarketRegime.UNKNOWN
      }))
      .filter(item => item.record.parityMetrics !== undefined);

    // Analyze by strategy
    const strategies = this.analyzeByStrategy(recordsWithScores);

    // Analyze by regime
    const regimes = this.analyzeByRegime(recordsWithScores);

    // Analyze by strategy×regime combination
    const combinations = this.analyzeByCombination(recordsWithScores);
    
    // Identify unsafe combinations
    const unsafeCombinations = Array.from(combinations.values())
      .filter(c => c.isUnsafe);

    // Calculate overall confidence score
    const overallConfidenceScore = this.calculateOverallConfidence(recordsWithScores);

    return {
      strategies,
      regimes,
      combinations,
      unsafeCombinations,
      overallConfidenceScore
    };
  }

  /**
   * Analyze confidence by strategy
   */
  private analyzeByStrategy(
    recordsWithScores: Array<{ record: ShadowExecutionRecord; confidenceScore: number; regime: MarketRegime }>
  ): Map<string, StrategyConfidenceMetrics> {
    const strategyMap = new Map<string, StrategyConfidenceMetrics>();

    // Group by strategy
    const byStrategy = new Map<string, typeof recordsWithScores>();
    for (const item of recordsWithScores) {
      const strategyId = item.record.request.strategy;
      if (!byStrategy.has(strategyId)) {
        byStrategy.set(strategyId, []);
      }
      byStrategy.get(strategyId)!.push(item);
    }

    // Calculate metrics per strategy
    for (const [strategyId, items] of byStrategy) {
      const scores = items.map(i => i.confidenceScore);
      const metrics: StrategyConfidenceMetrics = {
        strategyId,
        totalTrades: items.length,
        tradesWithMetrics: items.length,
        averageConfidenceScore: this.average(scores),
        worstCaseConfidenceScore: Math.min(...scores),
        confidenceScoreStdDev: this.standardDeviation(scores),
        isConfident: this.average(scores) >= this.confidenceThreshold
      };
      strategyMap.set(strategyId, metrics);
    }

    return strategyMap;
  }

  /**
   * Analyze confidence by regime
   */
  private analyzeByRegime(
    recordsWithScores: Array<{ record: ShadowExecutionRecord; confidenceScore: number; regime: MarketRegime }>
  ): Map<MarketRegime, RegimeConfidenceMetrics> {
    const regimeMap = new Map<MarketRegime, RegimeConfidenceMetrics>();

    // Group by regime
    const byRegime = new Map<MarketRegime, typeof recordsWithScores>();
    for (const item of recordsWithScores) {
      if (!byRegime.has(item.regime)) {
        byRegime.set(item.regime, []);
      }
      byRegime.get(item.regime)!.push(item);
    }

    // Calculate metrics per regime
    for (const [regime, items] of byRegime) {
      const scores = items.map(i => i.confidenceScore);
      const metrics: RegimeConfidenceMetrics = {
        regime,
        totalTrades: items.length,
        tradesWithMetrics: items.length,
        averageConfidenceScore: this.average(scores),
        worstCaseConfidenceScore: Math.min(...scores),
        confidenceScoreStdDev: this.standardDeviation(scores),
        isConfident: this.average(scores) >= this.confidenceThreshold
      };
      regimeMap.set(regime, metrics);
    }

    return regimeMap;
  }

  /**
   * Analyze confidence by strategy×regime combination
   */
  private analyzeByCombination(
    recordsWithScores: Array<{ record: ShadowExecutionRecord; confidenceScore: number; regime: MarketRegime }>
  ): Map<string, StrategyRegimeCombinationMetrics> {
    const combinationMap = new Map<string, StrategyRegimeCombinationMetrics>();

    // Group by strategy×regime
    const byCombination = new Map<string, typeof recordsWithScores>();
    for (const item of recordsWithScores) {
      const key = `${item.record.request.strategy}:${item.regime}`;
      if (!byCombination.has(key)) {
        byCombination.set(key, []);
      }
      byCombination.get(key)!.push(item);
    }

    // Calculate metrics per combination
    for (const [key, items] of byCombination) {
      const [strategyId, regimeStr] = key.split(':');
      const regime = regimeStr as MarketRegime;
      const scores = items.map(i => i.confidenceScore);
      
      const avgScore = this.average(scores);
      const worstScore = Math.min(...scores);
      const stdDev = this.standardDeviation(scores);
      
      // Determine if unsafe
      const isUnsafe = this.isUnsafeCombination(
        strategyId,
        regime,
        avgScore,
        worstScore,
        stdDev,
        items.length
      );

      const metrics: StrategyRegimeCombinationMetrics = {
        strategyId,
        regime,
        totalTrades: items.length,
        tradesWithMetrics: items.length,
        averageConfidenceScore: avgScore,
        worstCaseConfidenceScore: worstScore,
        confidenceScoreStdDev: stdDev,
        isConfident: avgScore >= this.confidenceThreshold,
        isUnsafe,
        unsafeReason: isUnsafe ? this.generateUnsafeReason(avgScore, worstScore, stdDev, items.length) : undefined
      };
      
      combinationMap.set(key, metrics);
    }

    return combinationMap;
  }

  /**
   * Determine if a strategy×regime combination is unsafe
   * 
   * Explicit rules (no ML, no heuristics without explanation):
   * 1. Average confidence < 90% AND has minimum trades → UNSAFE
   * 2. Worst case confidence < 60% → UNSAFE (even if average is good)
   * 3. High variance (std dev > 20) AND average < 95% → UNSAFE (inconsistent)
   * 4. Insufficient trades (< minimum) → UNSAFE (not enough data)
   */
  private isUnsafeCombination(
    strategyId: string,
    regime: MarketRegime,
    avgScore: number,
    worstScore: number,
    stdDev: number,
    tradeCount: number
  ): boolean {
    // Rule 1: Average confidence below threshold with sufficient data
    if (tradeCount >= this.minimumTradesPerCombination && avgScore < this.confidenceThreshold) {
      return true;
    }

    // Rule 2: Worst case confidence too low (even if average is good)
    if (worstScore < 60) {
      return true;
    }

    // Rule 3: High variance indicates inconsistency
    if (stdDev > 20 && avgScore < 95) {
      return true;
    }

    // Rule 4: Insufficient data
    if (tradeCount < this.minimumTradesPerCombination) {
      return true;
    }

    return false;
  }

  /**
   * Generate explanation for why combination is unsafe
   */
  private generateUnsafeReason(
    avgScore: number,
    worstScore: number,
    stdDev: number,
    tradeCount: number
  ): string {
    const reasons: string[] = [];

    if (tradeCount < this.minimumTradesPerCombination) {
      reasons.push(`Insufficient trades (${tradeCount} < ${this.minimumTradesPerCombination} minimum)`);
    }
    if (avgScore < this.confidenceThreshold) {
      reasons.push(`Average confidence ${avgScore.toFixed(1)}% < ${this.confidenceThreshold}% threshold`);
    }
    if (worstScore < 60) {
      reasons.push(`Worst case confidence ${worstScore.toFixed(1)}% < 60% (too risky)`);
    }
    if (stdDev > 20 && avgScore < 95) {
      reasons.push(`High variance (std dev ${stdDev.toFixed(1)}%) indicates inconsistency`);
    }

    return reasons.join('; ');
  }

  /**
   * Compute confidence score for a single shadow record
   * 
   * Uses same heuristic as ParitySummaryGenerator:
   * - Fill match percentage (40% weight)
   * - Average price error (30% weight)
   * - Average slippage error (20% weight)
   * - Price error consistency (10% weight)
   */
  private computeConfidenceScore(record: ShadowExecutionRecord): number {
    if (!record.parityMetrics) {
      return 0;
    }

    const m = record.parityMetrics;

    // Fill match score (0-40 points)
    const fillMatchScore = m.fillProbabilityMatch * 40;

    // Price error score (0-30 points)
    // Lower error = higher score
    // Assume <1% error is excellent, >5% is poor
    const priceErrorPct = Math.abs(m.executionPriceErrorPct);
    const priceErrorScore = Math.max(0, 30 * (1 - Math.min(priceErrorPct / 5, 1)));

    // Slippage error score (0-20 points)
    // Lower error = higher score
    const slippageErrorPct = Math.abs(m.slippageErrorPct);
    const slippageErrorScore = Math.max(0, 20 * (1 - Math.min(slippageErrorPct / 10, 1)));

    // Consistency score (0-10 points)
    // Use price error consistency (inverse of variance)
    // For now, use a simple heuristic based on price error percentage
    // Lower error = more consistent
    const consistencyScore = Math.max(0, 10 * (1 - Math.min(priceErrorPct / 2, 1)));

    return Math.round(fillMatchScore + priceErrorScore + slippageErrorScore + consistencyScore);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    recordsWithScores: Array<{ record: ShadowExecutionRecord; confidenceScore: number; regime: MarketRegime }>
  ): number {
    if (recordsWithScores.length === 0) {
      return 0;
    }

    const scores = recordsWithScores.map(i => i.confidenceScore);
    return Math.round(this.average(scores));
  }

  /**
   * Get tracking ID from record
   */
  private getTrackingId(record: ShadowExecutionRecord): string {
    return `SHADOW_${record.decisionTimestamp.getTime()}_${record.request.pair}_${record.request.strategy}`;
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.average(values);
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquaredDiff = this.average(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }
}
