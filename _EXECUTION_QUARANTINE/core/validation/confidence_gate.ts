/**
 * Confidence Gate
 * 
 * VALIDATION MODE: Hard blocks REAL execution unless validation requirements are met.
 * 
 * Requirements for REAL execution:
 * - Shadow trades ≥ 500
 * - Runtime ≥ 100 active trading days
 * - Confidence score ≥ 90
 * 
 * Design Principles:
 * - Hard block (throws error, cannot be bypassed)
 * - Emits CONFIDENCE_GATE_BLOCKED event
 * - Deterministic checks (no ML, no heuristics)
 * - Read-only validation (does not modify state)
 */

import { RegimeCoverageTracker } from '../confidence/regime_coverage_tracker';
import { StrategyConfidenceAnalyzer } from '../confidence/strategy_confidence_analyzer';
import { ShadowExecutionTracker } from '../shadow/shadow_execution_tracker';
import { ObservabilityHooks } from '../observability/observability_integration';

export interface ConfidenceGateRequirements {
  minimumShadowTrades: number;
  minimumRuntimeDays: number;
  minimumConfidenceScore: number;
}

export interface ConfidenceGateCheck {
  allowed: boolean;
  reason?: string;
  shadowTrades: number;
  requiredShadowTrades: number;
  runtimeDays: number;
  requiredRuntimeDays: number;
  confidenceScore: number;
  requiredConfidenceScore: number;
  allRegimesCovered: boolean;
  noUnsafeCombinations: boolean;
}

export const DEFAULT_CONFIDENCE_GATE_REQUIREMENTS: ConfidenceGateRequirements = {
  minimumShadowTrades: 500,
  minimumRuntimeDays: 100,
  minimumConfidenceScore: 90
};

/**
 * Confidence Gate
 * 
 * Hard blocks REAL execution mode unless all validation requirements are met.
 * This gate is checked BEFORE any REAL execution can proceed.
 */
export class ConfidenceGate {
  private requirements: ConfidenceGateRequirements;
  private coverageTracker: RegimeCoverageTracker;
  private confidenceAnalyzer: StrategyConfidenceAnalyzer;
  private shadowTracker: ShadowExecutionTracker;
  private runtimeTracker: RuntimeTracker;
  private observabilityHooks?: ObservabilityHooks;

  constructor(
    coverageTracker: RegimeCoverageTracker,
    confidenceAnalyzer: StrategyConfidenceAnalyzer,
    shadowTracker: ShadowExecutionTracker,
    runtimeTracker: RuntimeTracker,
    requirements?: ConfidenceGateRequirements,
    observabilityHooks?: ObservabilityHooks
  ) {
    this.coverageTracker = coverageTracker;
    this.confidenceAnalyzer = confidenceAnalyzer;
    this.shadowTracker = shadowTracker;
    this.runtimeTracker = runtimeTracker;
    this.requirements = requirements || DEFAULT_CONFIDENCE_GATE_REQUIREMENTS;
    this.observabilityHooks = observabilityHooks;
  }

  /**
   * Check if REAL execution is allowed
   * 
   * This is a HARD BLOCK - if requirements are not met, throws error.
   * Cannot be bypassed.
   */
  checkRealExecutionAllowed(): ConfidenceGateCheck {
    // Get shadow trade count
    const coverage = this.coverageTracker.getCoverageSummary();
    const shadowTrades = coverage.totalTrades;

    // Get runtime days
    const runtimeDays = this.runtimeTracker.getActiveTradingDays();

    // Get confidence score
    const allRecords = this.shadowTracker.getAllShadowRecords();
    const regimeMap = new Map<string, any>();
    // Build regime map from records
    for (const record of allRecords) {
      if (record.regime) {
        const trackingId = `SHADOW_${record.decisionTimestamp.getTime()}_${record.request.pair}_${record.request.strategy}`;
        regimeMap.set(trackingId, record.regime);
      }
    }
    const confidence = this.confidenceAnalyzer.analyzeConfidence(allRecords, regimeMap);
    const confidenceScore = confidence.overallConfidenceScore;

    // Check all requirements
    const shadowTradesMet = shadowTrades >= this.requirements.minimumShadowTrades;
    const runtimeMet = runtimeDays >= this.requirements.minimumRuntimeDays;
    const confidenceMet = confidenceScore >= this.requirements.minimumConfidenceScore;
    const regimesCovered = coverage.allRegimesCovered;
    const noUnsafeCombos = confidence.unsafeCombinations.length === 0;

    const allowed = shadowTradesMet && runtimeMet && confidenceMet && regimesCovered && noUnsafeCombos;

    const check: ConfidenceGateCheck = {
      allowed,
      shadowTrades,
      requiredShadowTrades: this.requirements.minimumShadowTrades,
      runtimeDays,
      requiredRuntimeDays: this.requirements.minimumRuntimeDays,
      confidenceScore,
      requiredConfidenceScore: this.requirements.minimumConfidenceScore,
      allRegimesCovered: regimesCovered,
      noUnsafeCombinations: noUnsafeCombos
    };

    if (!allowed) {
      const reasons: string[] = [];
      if (!shadowTradesMet) {
        reasons.push(`Shadow trades ${shadowTrades} < ${this.requirements.minimumShadowTrades} required`);
      }
      if (!runtimeMet) {
        reasons.push(`Runtime ${runtimeDays.toFixed(1)} days < ${this.requirements.minimumRuntimeDays} required`);
      }
      if (!confidenceMet) {
        reasons.push(`Confidence score ${confidenceScore.toFixed(1)}% < ${this.requirements.minimumConfidenceScore}% required`);
      }
      if (!regimesCovered) {
        reasons.push(`Not all regimes covered (need minimum trades per regime)`);
      }
      if (!noUnsafeCombos) {
        reasons.push(`${confidence.unsafeCombinations.length} unsafe strategy×regime combination(s) must be addressed`);
      }

      check.reason = reasons.join('; ');

      // Emit CONFIDENCE_GATE_BLOCKED event
      if (this.observabilityHooks) {
        this.observabilityHooks.logConfidenceGateBlocked(check);
      }
    }

    return check;
  }

  /**
   * Enforce confidence gate (throws error if not allowed)
   * 
   * Call this BEFORE allowing REAL execution.
   */
  enforceRealExecutionAllowed(): void {
    const check = this.checkRealExecutionAllowed();
    
    if (!check.allowed) {
      const error = new Error(
        `[CONFIDENCE_GATE] REAL execution blocked: ${check.reason}`
      );
      (error as any).confidenceGateCheck = check;
      throw error;
    }
  }

  /**
   * Get current validation status
   */
  getValidationStatus(): ConfidenceGateCheck {
    return this.checkRealExecutionAllowed();
  }
}
