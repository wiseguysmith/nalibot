/**
 * Parity Summary Generator
 * 
 * PHASE 9: Shadow Trading & Execution Parity
 * 
 * Generates aggregate parity reports from shadow execution records.
 * Produces investor-explainable summaries of execution accuracy.
 */

import { ShadowExecutionRecord } from './shadow_execution_tracker';
import { ParityMetrics } from './parity_metrics';

export interface ParitySummary {
  /**
   * Summary metadata
   */
  generatedAt: Date;
  totalTrades: number;
  observationWindowMs: number;
  
  /**
   * Fill match statistics
   */
  fillMatch: {
    total: number;
    matched: number;
    matchPercentage: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  
  /**
   * Price error statistics
   */
  priceError: {
    average: number;
    averagePct: number;
    worstCase: number;
    worstCasePct: number;
    standardDeviation: number;
  };
  
  /**
   * Slippage statistics
   */
  slippage: {
    averageError: number;
    averageErrorPct: number;
    worstCase: number;
    worstCasePct: number;
  };
  
  /**
   * PnL delta statistics
   */
  pnlDelta: {
    total: number;
    average: number;
    averagePct: number;
    worstCase: number;
    worstCasePct: number;
  };
  
  /**
   * Latency sensitivity
   */
  latencySensitivity: {
    average: number;
    averagePct: number;
    worstCase: number;
    worstCasePct: number;
  };
  
  /**
   * Overall confidence score (0-100)
   * Simple heuristic: higher = more confident in execution accuracy
   */
  confidenceScore: number;
  
  /**
   * Individual trade records (for detailed analysis)
   */
  trades: Array<{
    trackingId: string;
    strategy: string;
    pair: string;
    action: 'buy' | 'sell';
    decisionPrice: number;
    simulatedPrice: number;
    observedPriceAtLatency: number;
    fillMatch: boolean;
    priceError: number;
    priceErrorPct: number;
    slippageError: number;
    pnlDelta: number;
    timestamp: Date;
  }>;
}

/**
 * Parity Summary Generator
 * 
 * Aggregates shadow execution records into a comprehensive parity report.
 */
export class ParitySummaryGenerator {
  /**
   * Generate parity summary from shadow records
   */
  generateSummary(
    records: ShadowExecutionRecord[],
    observationWindowMs: number
  ): ParitySummary {
    if (records.length === 0) {
      return this.generateEmptySummary(observationWindowMs);
    }

    // Filter records with parity metrics
    const recordsWithMetrics = records.filter(r => r.parityMetrics);
    
    if (recordsWithMetrics.length === 0) {
      return this.generateEmptySummary(observationWindowMs);
    }

    // Extract metrics
    const metrics = recordsWithMetrics.map(r => r.parityMetrics!);
    
    // Compute fill match statistics
    const fillMatches = metrics.map(m => m.fillProbabilityMatch >= 0.8);
    const matchedCount = fillMatches.filter(m => m).length;
    
    // Compute price errors
    const priceErrors = metrics.map(m => Math.abs(m.executionPriceError));
    const priceErrorPcts = metrics.map(m => Math.abs(m.executionPriceErrorPct));
    
    // Compute slippage errors
    const slippageErrors = metrics.map(m => Math.abs(m.slippageError));
    const slippageErrorPcts = metrics.map(m => Math.abs(m.slippageErrorPct));
    
    // Compute PnL deltas
    const pnlDeltas = metrics.map(m => m.pnlDelta);
    const pnlDeltaPcts = metrics.map(m => Math.abs(m.pnlDeltaPct));
    
    // Compute latency sensitivity
    const latencySensitivities = metrics.map(m => Math.abs(m.latencySensitivity));
    const latencySensitivityPcts = metrics.map(m => Math.abs(m.latencySensitivityPct));
    
    // Compute statistics
    const avgPriceError = this.average(priceErrors);
    const avgPriceErrorPct = this.average(priceErrorPcts);
    const worstPriceError = Math.max(...priceErrors);
    const worstPriceErrorPct = Math.max(...priceErrorPcts);
    const priceErrorStdDev = this.standardDeviation(priceErrors);
    
    const avgSlippageError = this.average(slippageErrors);
    const avgSlippageErrorPct = this.average(slippageErrorPcts);
    const worstSlippageError = Math.max(...slippageErrors);
    const worstSlippageErrorPct = Math.max(...slippageErrorPcts);
    
    const totalPnLDelta = pnlDeltas.reduce((sum, delta) => sum + delta, 0);
    const avgPnLDelta = totalPnLDelta / pnlDeltas.length;
    const avgPnLDeltaPct = this.average(pnlDeltaPcts);
    const worstPnLDelta = Math.max(...pnlDeltas.map(Math.abs));
    const worstPnLDeltaPct = Math.max(...pnlDeltaPcts);
    
    const avgLatencySensitivity = this.average(latencySensitivities);
    const avgLatencySensitivityPct = this.average(latencySensitivityPcts);
    const worstLatencySensitivity = Math.max(...latencySensitivities);
    const worstLatencySensitivityPct = Math.max(...latencySensitivityPcts);
    
    // Compute confidence score (0-100)
    // Higher score = better execution accuracy
    const confidenceScore = this.computeConfidenceScore(
      matchedCount / fillMatches.length,
      avgPriceErrorPct,
      avgSlippageErrorPct,
      priceErrorStdDev
    );
    
    // Determine fill match confidence
    const fillMatchPercentage = (matchedCount / fillMatches.length) * 100;
    let fillMatchConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
    if (fillMatchPercentage >= 90) {
      fillMatchConfidence = 'HIGH';
    } else if (fillMatchPercentage >= 70) {
      fillMatchConfidence = 'MEDIUM';
    } else {
      fillMatchConfidence = 'LOW';
    }
    
    // Build individual trade records
    const tradeRecords = recordsWithMetrics.map((record, index) => {
      const m = record.parityMetrics!;
      const decisionSnapshot = record.observedSnapshots[0];
      const latencySnapshot = record.observedSnapshots.find(
        s => Math.abs(s.timestamp.getTime() - 
          (record.decisionTimestamp.getTime() + observationWindowMs / 10)) < 1000
      ) || decisionSnapshot;
      
      return {
        trackingId: `SHADOW_${record.decisionTimestamp.getTime()}_${record.request.pair}_${record.request.strategy}`,
        strategy: record.request.strategy,
        pair: record.request.pair,
        action: record.request.action,
        decisionPrice: decisionSnapshot.price,
        simulatedPrice: record.simulatedResult.executionPrice || record.request.price,
        observedPriceAtLatency: latencySnapshot.price,
        fillMatch: m.fillProbabilityMatch >= 0.8,
        priceError: m.executionPriceError,
        priceErrorPct: m.executionPriceErrorPct,
        slippageError: m.slippageError,
        pnlDelta: m.pnlDelta,
        timestamp: record.decisionTimestamp
      };
    });
    
    return {
      generatedAt: new Date(),
      totalTrades: recordsWithMetrics.length,
      observationWindowMs,
      
      fillMatch: {
        total: fillMatches.length,
        matched: matchedCount,
        matchPercentage: fillMatchPercentage,
        confidence: fillMatchConfidence
      },
      
      priceError: {
        average: avgPriceError,
        averagePct: avgPriceErrorPct,
        worstCase: worstPriceError,
        worstCasePct: worstPriceErrorPct,
        standardDeviation: priceErrorStdDev
      },
      
      slippage: {
        averageError: avgSlippageError,
        averageErrorPct: avgSlippageErrorPct,
        worstCase: worstSlippageError,
        worstCasePct: worstSlippageErrorPct
      },
      
      pnlDelta: {
        total: totalPnLDelta,
        average: avgPnLDelta,
        averagePct: avgPnLDeltaPct,
        worstCase: worstPnLDelta,
        worstCasePct: worstPnLDeltaPct
      },
      
      latencySensitivity: {
        average: avgLatencySensitivity,
        averagePct: avgLatencySensitivityPct,
        worstCase: worstLatencySensitivity,
        worstCasePct: worstLatencySensitivityPct
      },
      
      confidenceScore,
      
      trades: tradeRecords
    };
  }
  
  /**
   * Generate empty summary (no trades)
   */
  private generateEmptySummary(observationWindowMs: number): ParitySummary {
    return {
      generatedAt: new Date(),
      totalTrades: 0,
      observationWindowMs,
      fillMatch: {
        total: 0,
        matched: 0,
        matchPercentage: 0,
        confidence: 'LOW'
      },
      priceError: {
        average: 0,
        averagePct: 0,
        worstCase: 0,
        worstCasePct: 0,
        standardDeviation: 0
      },
      slippage: {
        averageError: 0,
        averageErrorPct: 0,
        worstCase: 0,
        worstCasePct: 0
      },
      pnlDelta: {
        total: 0,
        average: 0,
        averagePct: 0,
        worstCase: 0,
        worstCasePct: 0
      },
      latencySensitivity: {
        average: 0,
        averagePct: 0,
        worstCase: 0,
        worstCasePct: 0
      },
      confidenceScore: 0,
      trades: []
    };
  }
  
  /**
   * Compute confidence score (0-100)
   * 
   * Simple heuristic based on:
   * - Fill match percentage (40% weight)
   * - Average price error (30% weight)
   * - Average slippage error (20% weight)
   * - Price error consistency (10% weight)
   */
  private computeConfidenceScore(
    fillMatchRatio: number,
    avgPriceErrorPct: number,
    avgSlippageErrorPct: number,
    priceErrorStdDev: number
  ): number {
    // Fill match score (0-40 points)
    const fillMatchScore = fillMatchRatio * 40;
    
    // Price error score (0-30 points)
    // Lower error = higher score
    // Assume <1% error is excellent, >5% is poor
    const priceErrorScore = Math.max(0, 30 * (1 - Math.min(avgPriceErrorPct / 5, 1)));
    
    // Slippage error score (0-20 points)
    // Lower error = higher score
    const slippageErrorScore = Math.max(0, 20 * (1 - Math.min(avgSlippageErrorPct / 10, 1)));
    
    // Consistency score (0-10 points)
    // Lower std dev = higher score (more consistent)
    // Assume <0.5% std dev is excellent, >2% is poor
    const consistencyScore = Math.max(0, 10 * (1 - Math.min(priceErrorStdDev / 2, 1)));
    
    return Math.round(fillMatchScore + priceErrorScore + slippageErrorScore + consistencyScore);
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
  
  /**
   * Export summary as JSON string
   */
  exportAsJSON(summary: ParitySummary): string {
    return JSON.stringify(summary, null, 2);
  }
  
  /**
   * Export summary as human-readable text report
   */
  exportAsText(summary: ParitySummary): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('SHADOW TRADING PARITY SUMMARY');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Generated: ${summary.generatedAt.toISOString()}`);
    lines.push(`Total Trades Evaluated: ${summary.totalTrades}`);
    lines.push(`Observation Window: ${summary.observationWindowMs}ms`);
    lines.push('');
    
    lines.push('📊 FILL MATCH STATISTICS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`  Total Trades: ${summary.fillMatch.total}`);
    lines.push(`  Matched: ${summary.fillMatch.matched}`);
    lines.push(`  Match Percentage: ${summary.fillMatch.matchPercentage.toFixed(1)}%`);
    lines.push(`  Confidence: ${summary.fillMatch.confidence}`);
    lines.push('');
    
    lines.push('💰 PRICE ERROR STATISTICS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`  Average Error: $${summary.priceError.average.toFixed(2)} (${summary.priceError.averagePct.toFixed(2)}%)`);
    lines.push(`  Worst Case: $${summary.priceError.worstCase.toFixed(2)} (${summary.priceError.worstCasePct.toFixed(2)}%)`);
    lines.push(`  Standard Deviation: $${summary.priceError.standardDeviation.toFixed(2)}`);
    lines.push('');
    
    lines.push('📉 SLIPPAGE ERROR STATISTICS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`  Average Error: $${summary.slippage.averageError.toFixed(2)} (${summary.slippage.averageErrorPct.toFixed(2)}%)`);
    lines.push(`  Worst Case: $${summary.slippage.worstCase.toFixed(2)} (${summary.slippage.worstCasePct.toFixed(2)}%)`);
    lines.push('');
    
    lines.push('💵 PnL DELTA STATISTICS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`  Total Delta: $${summary.pnlDelta.total.toFixed(2)}`);
    lines.push(`  Average Delta: $${summary.pnlDelta.average.toFixed(2)} (${summary.pnlDelta.averagePct.toFixed(2)}%)`);
    lines.push(`  Worst Case: $${summary.pnlDelta.worstCase.toFixed(2)} (${summary.pnlDelta.worstCasePct.toFixed(2)}%)`);
    lines.push('');
    
    lines.push('⏱️  LATENCY SENSITIVITY');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`  Average: $${summary.latencySensitivity.average.toFixed(2)} (${summary.latencySensitivity.averagePct.toFixed(2)}%)`);
    lines.push(`  Worst Case: $${summary.latencySensitivity.worstCase.toFixed(2)} (${summary.latencySensitivity.worstCasePct.toFixed(2)}%)`);
    lines.push('');
    
    lines.push('🎯 OVERALL CONFIDENCE SCORE');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`  Score: ${summary.confidenceScore}/100`);
    if (summary.confidenceScore >= 80) {
      lines.push(`  Assessment: HIGH CONFIDENCE - Execution accuracy is excellent`);
    } else if (summary.confidenceScore >= 60) {
      lines.push(`  Assessment: MEDIUM CONFIDENCE - Execution accuracy is acceptable`);
    } else {
      lines.push(`  Assessment: LOW CONFIDENCE - Execution accuracy needs improvement`);
    }
    lines.push('');
    
    if (summary.trades.length > 0) {
      lines.push('📋 INDIVIDUAL TRADE RECORDS');
      lines.push('───────────────────────────────────────────────────────────');
      summary.trades.forEach((trade, index) => {
        lines.push(`\n  Trade ${index + 1}: ${trade.strategy} ${trade.action.toUpperCase()} ${trade.pair}`);
        lines.push(`    Decision Price: $${trade.decisionPrice.toFixed(2)}`);
        lines.push(`    Simulated Price: $${trade.simulatedPrice.toFixed(2)}`);
        lines.push(`    Observed Price: $${trade.observedPriceAtLatency.toFixed(2)}`);
        lines.push(`    Fill Match: ${trade.fillMatch ? '✅ YES' : '❌ NO'}`);
        lines.push(`    Price Error: $${trade.priceError.toFixed(2)} (${trade.priceErrorPct.toFixed(2)}%)`);
        lines.push(`    Slippage Error: $${trade.slippageError.toFixed(2)}`);
        lines.push(`    PnL Delta: $${trade.pnlDelta.toFixed(2)}`);
        lines.push(`    Timestamp: ${trade.timestamp.toISOString()}`);
      });
      lines.push('');
    }
    
    lines.push('═══════════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }
}
