/**
 * Confidence Report Generator
 * 
 * PHASE 10: Confidence Accumulation & Coverage
 * 
 * Generates comprehensive confidence reports combining:
 * - Regime coverage
 * - Strategy confidence
 * - Trend analysis
 * - Unsafe combinations
 * 
 * Design Principles:
 * - Deterministic report generation
 * - Exportable (JSON + text)
 * - Investor-explainable
 * - Replayable
 */

import { RegimeCoverageSummary } from './regime_coverage_tracker';
import { StrategyConfidenceAnalysis } from './strategy_confidence_analyzer';
import { TrendAnalysis } from './confidence_trend_tracker';
import { MarketRegime } from '../regime_detector';

export interface ConfidenceReport {
  generatedAt: Date;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  
  // Coverage
  coverage: RegimeCoverageSummary;
  
  // Confidence analysis
  confidence: StrategyConfidenceAnalysis;
  
  // Trends
  trends: TrendAnalysis;
  
  // Overall assessment
  overallConfidence: number; // 0-100
  isReadyForLiveTrading: boolean; // >= 90% confidence AND all regimes covered
  readinessFactors: {
    coverageMet: boolean;
    confidenceMet: boolean;
    noUnsafeCombinations: boolean;
    trendStable: boolean;
  };
  
  // Recommendations
  recommendations: string[];
  warnings: string[];
}

/**
 * Confidence Report Generator
 * 
 * Generates comprehensive confidence reports for operator review.
 */
export class ConfidenceReportGenerator {
  private confidenceThreshold: number = 90;

  constructor(config?: {
    confidenceThreshold?: number;
  }) {
    if (config?.confidenceThreshold !== undefined) {
      this.confidenceThreshold = config.confidenceThreshold;
    }
  }

  /**
   * Generate confidence report
   */
  generateReport(
    coverage: RegimeCoverageSummary,
    confidence: StrategyConfidenceAnalysis,
    trends: TrendAnalysis,
    reportStartDate: Date,
    reportEndDate: Date
  ): ConfidenceReport {
    // Calculate overall confidence
    const overallConfidence = confidence.overallConfidenceScore;

    // Determine readiness factors
    const coverageMet = coverage.allRegimesCovered;
    const confidenceMet = overallConfidence >= this.confidenceThreshold;
    const noUnsafeCombinations = confidence.unsafeCombinations.length === 0;
    const trendStable = trends.overallTrend !== 'DEGRADING';

    // Determine if ready for live trading
    const isReadyForLiveTrading = 
      coverageMet &&
      confidenceMet &&
      noUnsafeCombinations &&
      trendStable;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      coverage,
      confidence,
      trends,
      overallConfidence
    );

    // Generate warnings
    const warnings = this.generateWarnings(
      coverage,
      confidence,
      trends,
      overallConfidence
    );

    return {
      generatedAt: new Date(),
      reportPeriod: {
        start: reportStartDate,
        end: reportEndDate
      },
      coverage,
      confidence,
      trends,
      overallConfidence,
      isReadyForLiveTrading,
      readinessFactors: {
        coverageMet,
        confidenceMet,
        noUnsafeCombinations,
        trendStable
      },
      recommendations,
      warnings
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    coverage: RegimeCoverageSummary,
    confidence: StrategyConfidenceAnalysis,
    trends: TrendAnalysis,
    overallConfidence: number
  ): string[] {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (!coverage.allRegimesCovered) {
      const underCovered = Array.from(coverage.coverageByRegime.values())
        .filter(c => !c.isCovered)
        .map(c => c.regime);
      recommendations.push(
        `Continue shadow trading to cover regimes: ${underCovered.join(', ')}`
      );
    }

    // Confidence recommendations
    if (overallConfidence < this.confidenceThreshold) {
      const gap = this.confidenceThreshold - overallConfidence;
      recommendations.push(
        `Overall confidence ${overallConfidence.toFixed(1)}% is below ${this.confidenceThreshold}% threshold. Need ${gap.toFixed(1)}% improvement.`
      );
    }

    // Unsafe combinations
    if (confidence.unsafeCombinations.length > 0) {
      const unsafeList = confidence.unsafeCombinations
        .map(c => `${c.strategyId} × ${c.regime}`)
        .join(', ');
      recommendations.push(
        `Review unsafe strategy×regime combinations: ${unsafeList}`
      );
    }

    // Trend recommendations
    if (trends.overallTrend === 'DEGRADING') {
      recommendations.push(
        `Confidence trend is degrading. Investigate root causes before proceeding.`
      );
    }

    // Positive recommendations
    if (coverage.allRegimesCovered && overallConfidence >= this.confidenceThreshold && confidence.unsafeCombinations.length === 0) {
      recommendations.push(
        `All coverage and confidence requirements met. Consider proceeding to live trading with small amounts.`
      );
    }

    return recommendations;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    coverage: RegimeCoverageSummary,
    confidence: StrategyConfidenceAnalysis,
    trends: TrendAnalysis,
    overallConfidence: number
  ): string[] {
    const warnings: string[] = [];

    // Critical warnings
    if (overallConfidence < 60) {
      warnings.push(
        `CRITICAL: Overall confidence ${overallConfidence.toFixed(1)}% is critically low. Do NOT proceed to live trading.`
      );
    }

    if (confidence.unsafeCombinations.length > 0) {
      warnings.push(
        `WARNING: ${confidence.unsafeCombinations.length} unsafe strategy×regime combination(s) identified. These must be addressed before live trading.`
      );
    }

    if (trends.overallTrend === 'DEGRADING' && trends.trendConfidence > 0.7) {
      warnings.push(
        `WARNING: Confidence trend is degrading with high confidence (${(trends.trendConfidence * 100).toFixed(0)}%). Investigate immediately.`
      );
    }

    // Coverage warnings
    if (!coverage.allRegimesCovered) {
      const underCovered = Array.from(coverage.coverageByRegime.values())
        .filter(c => !c.isCovered)
        .map(c => `${c.regime} (${c.tradesWithMetrics}/${c.minimumRequired})`);
      warnings.push(
        `Coverage incomplete: ${underCovered.join(', ')}`
      );
    }

    return warnings;
  }

  /**
   * Export report as JSON
   */
  exportAsJSON(report: ConfidenceReport): string {
    // Convert Maps to objects for JSON serialization
    const jsonReport = {
      ...report,
      coverage: {
        ...report.coverage,
        coverageByRegime: Object.fromEntries(
          Array.from(report.coverage.coverageByRegime.entries()).map(([regime, coverage]) => [
            regime,
            {
              ...coverage,
              regime: regime.toString()
            }
          ])
        )
      },
      confidence: {
        ...report.confidence,
        strategies: Object.fromEntries(report.confidence.strategies),
        regimes: Object.fromEntries(
          Array.from(report.confidence.regimes.entries()).map(([regime, metrics]) => [
            regime,
            {
              ...metrics,
              regime: regime.toString()
            }
          ])
        ),
        combinations: Object.fromEntries(report.confidence.combinations),
        unsafeCombinations: report.confidence.unsafeCombinations.map(c => ({
          ...c,
          regime: c.regime.toString()
        }))
      },
      trends: {
        ...report.trends,
        currentTrend: {
          ...report.trends.currentTrend,
          snapshots: report.trends.currentTrend.snapshots.map(s => ({
            ...s,
            confidenceByStrategy: Object.fromEntries(s.confidenceByStrategy),
            confidenceByRegime: Object.fromEntries(
              Array.from(s.confidenceByRegime.entries()).map(([regime, conf]) => [
                regime,
                conf
              ])
            )
          }))
        }
      }
    };

    return JSON.stringify(jsonReport, null, 2);
  }

  /**
   * Export report as human-readable text
   */
  exportAsText(report: ConfidenceReport): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('CONFIDENCE ACCUMULATION REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push(`Report Period: ${report.reportPeriod.start.toISOString()} to ${report.reportPeriod.end.toISOString()}`);
    lines.push('');

    // Overall Assessment
    lines.push('🎯 OVERALL ASSESSMENT');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Overall Confidence: ${report.overallConfidence.toFixed(1)}/100`);
    lines.push(`Ready for Live Trading: ${report.isReadyForLiveTrading ? '✅ YES' : '❌ NO'}`);
    lines.push('');
    lines.push('Readiness Factors:');
    lines.push(`  Coverage Met: ${report.readinessFactors.coverageMet ? '✅' : '❌'}`);
    lines.push(`  Confidence Met: ${report.readinessFactors.confidenceMet ? '✅' : '❌'}`);
    lines.push(`  No Unsafe Combinations: ${report.readinessFactors.noUnsafeCombinations ? '✅' : '❌'}`);
    lines.push(`  Trend Stable: ${report.readinessFactors.trendStable ? '✅' : '❌'}`);
    lines.push('');

    // Coverage Section
    lines.push('📊 REGIME COVERAGE');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Total Shadow Trades: ${report.coverage.totalTrades}`);
    lines.push(`Overall Coverage: ${report.coverage.overallCoveragePercentage.toFixed(1)}%`);
    lines.push(`All Regimes Covered: ${report.coverage.allRegimesCovered ? '✅ YES' : '❌ NO'}`);
    lines.push('');
    lines.push('Coverage by Regime:');
    for (const [regime, coverage] of report.coverage.coverageByRegime) {
      const status = coverage.isCovered ? '✅' : '❌';
      lines.push(`  ${status} ${regime}:`);
      lines.push(`    Trades: ${coverage.tradesWithMetrics}/${coverage.minimumRequired} (${coverage.coveragePercentage.toFixed(1)}%)`);
      if (coverage.firstTradeTimestamp) {
        lines.push(`    First Trade: ${coverage.firstTradeTimestamp.toISOString()}`);
      }
      if (coverage.lastTradeTimestamp) {
        lines.push(`    Last Trade: ${coverage.lastTradeTimestamp.toISOString()}`);
      }
    }
    lines.push('');

    // Confidence Section
    lines.push('💯 CONFIDENCE ANALYSIS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Overall Confidence Score: ${report.confidence.overallConfidenceScore.toFixed(1)}/100`);
    lines.push('');
    
    lines.push('Confidence by Strategy:');
    for (const [strategyId, metrics] of report.confidence.strategies) {
      const status = metrics.isConfident ? '✅' : '❌';
      lines.push(`  ${status} ${strategyId}:`);
      lines.push(`    Average: ${metrics.averageConfidenceScore.toFixed(1)}%`);
      lines.push(`    Worst Case: ${metrics.worstCaseConfidenceScore.toFixed(1)}%`);
      lines.push(`    Std Dev: ${metrics.confidenceScoreStdDev.toFixed(1)}`);
      lines.push(`    Trades: ${metrics.tradesWithMetrics}`);
    }
    lines.push('');

    lines.push('Confidence by Regime:');
    for (const [regime, metrics] of report.confidence.regimes) {
      const status = metrics.isConfident ? '✅' : '❌';
      lines.push(`  ${status} ${regime}:`);
      lines.push(`    Average: ${metrics.averageConfidenceScore.toFixed(1)}%`);
      lines.push(`    Worst Case: ${metrics.worstCaseConfidenceScore.toFixed(1)}%`);
      lines.push(`    Trades: ${metrics.tradesWithMetrics}`);
    }
    lines.push('');

    // Unsafe Combinations
    if (report.confidence.unsafeCombinations.length > 0) {
      lines.push('⚠️  UNSAFE STRATEGY × REGIME COMBINATIONS');
      lines.push('───────────────────────────────────────────────────────────');
      for (const combo of report.confidence.unsafeCombinations) {
        lines.push(`  ❌ ${combo.strategyId} × ${combo.regime}:`);
        lines.push(`     Average Confidence: ${combo.averageConfidenceScore.toFixed(1)}%`);
        lines.push(`     Worst Case: ${combo.worstCaseConfidenceScore.toFixed(1)}%`);
        lines.push(`     Trades: ${combo.tradesWithMetrics}`);
        if (combo.unsafeReason) {
          lines.push(`     Reason: ${combo.unsafeReason}`);
        }
      }
      lines.push('');
    }

    // Trends Section
    lines.push('📈 CONFIDENCE TRENDS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Overall Trend: ${report.trends.overallTrend}`);
    lines.push(`Trend Confidence: ${(report.trends.trendConfidence * 100).toFixed(1)}%`);
    lines.push('');
    lines.push(`Current Window (${report.trends.currentTrend.period.durationDays.toFixed(1)} days):`);
    lines.push(`  Trend: ${report.trends.currentTrend.trend}`);
    lines.push(`  Average Confidence: ${report.trends.currentTrend.averageConfidence.toFixed(1)}%`);
    lines.push(`  Change: ${report.trends.currentTrend.confidenceChange >= 0 ? '+' : ''}${report.trends.currentTrend.confidenceChange.toFixed(1)}% (${report.trends.currentTrend.confidenceChangePct >= 0 ? '+' : ''}${report.trends.currentTrend.confidenceChangePct.toFixed(1)}%)`);
    lines.push('');

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('💡 RECOMMENDATIONS');
      lines.push('───────────────────────────────────────────────────────────');
      report.recommendations.forEach((rec, i) => {
        lines.push(`  ${i + 1}. ${rec}`);
      });
      lines.push('');
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push('⚠️  WARNINGS');
      lines.push('───────────────────────────────────────────────────────────');
      report.warnings.forEach((warning, i) => {
        lines.push(`  ${i + 1}. ${warning}`);
      });
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}
