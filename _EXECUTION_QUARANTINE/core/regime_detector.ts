/**
 * System-Wide Regime Detector
 * 
 * PHASE 2: Regime-Aware Strategy Governance
 * 
 * This module detects the current market regime using simple, explainable metrics.
 * Regimes filter trades; they do NOT predict price.
 * 
 * Design Principles:
 * - Simplicity > cleverness
 * - Explainability > performance
 * - If regime is unclear → default to safety (UNKNOWN)
 */

export enum MarketRegime {
  FAVORABLE = 'FAVORABLE',
  UNFAVORABLE = 'UNFAVORABLE',
  UNKNOWN = 'UNKNOWN'
}

export interface RegimeMetrics {
  realizedVolatility: number;
  volatilityExpansion: number; // Positive = expansion, Negative = contraction
  trendStrength: number; // 0-1, higher = stronger trend
  correlationStability: number; // 0-1, higher = more stable
}

export interface RegimeResult {
  regime: MarketRegime;
  confidence: number; // 0-1
  metrics: RegimeMetrics;
  reason: string; // Explainable reason for the regime
}

/**
 * Regime Detector
 * 
 * Detects system-wide market regime using explainable metrics.
 * No ML, no optimization - just simple, clear rules.
 */
export class RegimeDetector {
  private lookbackPeriod: number = 20; // Number of periods to analyze
  private confidenceThreshold: number = 0.6; // Minimum confidence to declare FAVORABLE/UNFAVORABLE
  private volatilityExpansionThreshold: number = 0.1; // 10% volatility expansion threshold
  private trendStrengthThreshold: number = 0.5; // Minimum trend strength for FAVORABLE

  constructor(config?: {
    lookbackPeriod?: number;
    confidenceThreshold?: number;
    volatilityExpansionThreshold?: number;
    trendStrengthThreshold?: number;
  }) {
    if (config?.lookbackPeriod) this.lookbackPeriod = config.lookbackPeriod;
    if (config?.confidenceThreshold) this.confidenceThreshold = config.confidenceThreshold;
    if (config?.volatilityExpansionThreshold) this.volatilityExpansionThreshold = config.volatilityExpansionThreshold;
    if (config?.trendStrengthThreshold) this.trendStrengthThreshold = config.trendStrengthThreshold;
  }

  /**
   * Get current market regime
   * 
   * @param priceData Array of closing prices (most recent last)
   * @returns Current regime and confidence
   */
  getCurrentRegime(priceData: number[]): RegimeResult {
    if (!priceData || priceData.length < this.lookbackPeriod) {
      return {
        regime: MarketRegime.UNKNOWN,
        confidence: 0,
        metrics: {
          realizedVolatility: 0,
          volatilityExpansion: 0,
          trendStrength: 0,
          correlationStability: 0
        },
        reason: 'Insufficient data for regime detection'
      };
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(priceData);
    
    // Determine regime based on metrics
    const regime = this.determineRegime(metrics);
    const confidence = this.calculateConfidence(metrics, regime);
    const reason = this.explainRegime(regime, metrics, confidence);

    return {
      regime,
      confidence,
      metrics,
      reason
    };
  }

  /**
   * Calculate regime metrics from price data
   */
  private calculateMetrics(priceData: number[]): RegimeMetrics {
    const recent = priceData.slice(-this.lookbackPeriod);
    const previous = priceData.slice(-this.lookbackPeriod * 2, -this.lookbackPeriod);

    // Calculate realized volatility (standard deviation of returns)
    const returns = this.calculateReturns(recent);
    const realizedVolatility = this.calculateStandardDeviation(returns);

    // Calculate volatility expansion/contraction
    const previousReturns = this.calculateReturns(previous);
    const previousVolatility = this.calculateStandardDeviation(previousReturns);
    const volatilityExpansion = previousVolatility > 0 
      ? (realizedVolatility - previousVolatility) / previousVolatility 
      : 0;

    // Calculate trend strength (using linear regression slope normalized by price level)
    const trendStrength = this.calculateTrendStrength(recent);

    // Calculate correlation stability (simplified - using return autocorrelation)
    const correlationStability = this.calculateCorrelationStability(returns);

    return {
      realizedVolatility,
      volatilityExpansion,
      trendStrength,
      correlationStability
    };
  }

  /**
   * Calculate returns from price data
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }
    return returns;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate trend strength using linear regression
   * Returns 0-1, where 1 = perfect trend, 0 = no trend
   */
  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 2) return 0;

    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prices;

    // Calculate linear regression
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared (coefficient of determination)
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);

    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    
    // Normalize by price level to get relative strength
    const avgPrice = yMean;
    const relativeSlope = avgPrice > 0 ? Math.abs(slope) / avgPrice : 0;
    
    // Combine R-squared and relative slope
    return Math.min(1, rSquared * (1 + relativeSlope * 100));
  }

  /**
   * Calculate correlation stability (using autocorrelation of returns)
   * Higher = more stable/predictable structure
   */
  private calculateCorrelationStability(returns: number[]): number {
    if (returns.length < 2) return 0;

    // Calculate autocorrelation at lag 1
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;

    if (variance === 0) return 0;

    let autocovariance = 0;
    for (let i = 1; i < returns.length; i++) {
      autocovariance += (returns[i] - mean) * (returns[i - 1] - mean);
    }
    autocovariance /= (returns.length - 1);

    const autocorrelation = autocovariance / variance;
    
    // Convert to stability measure (0-1)
    // Positive autocorrelation = more stable structure
    return Math.max(0, Math.min(1, (autocorrelation + 1) / 2));
  }

  /**
   * Determine regime based on metrics
   */
  private determineRegime(metrics: RegimeMetrics): MarketRegime {
    // FAVORABLE: Structure + volatility present
    // - Volatility expansion OR high volatility
    // - Strong trend OR stable correlation
    const hasVolatility = metrics.realizedVolatility > 0.01 || metrics.volatilityExpansion > this.volatilityExpansionThreshold;
    const hasStructure = metrics.trendStrength > this.trendStrengthThreshold || metrics.correlationStability > 0.5;

    // UNFAVORABLE: Chop, random spikes, poor structure
    // - Low volatility AND contraction
    // - Weak trend AND unstable correlation
    const isChoppy = metrics.realizedVolatility < 0.005 && metrics.volatilityExpansion < -0.1;
    const isUnstructured = metrics.trendStrength < 0.3 && metrics.correlationStability < 0.3;

    if (hasVolatility && hasStructure) {
      return MarketRegime.FAVORABLE;
    }

    if (isChoppy || isUnstructured) {
      return MarketRegime.UNFAVORABLE;
    }

    // Default to UNKNOWN if unclear
    return MarketRegime.UNKNOWN;
  }

  /**
   * Calculate confidence in regime determination
   */
  private calculateConfidence(metrics: RegimeMetrics, regime: MarketRegime): number {
    if (regime === MarketRegime.UNKNOWN) {
      return 0;
    }

    // Confidence based on how clear the signals are
    let confidence = 0;

    if (regime === MarketRegime.FAVORABLE) {
      // High confidence if volatility and structure are both strong
      const volatilitySignal = Math.min(1, metrics.realizedVolatility * 100);
      const structureSignal = (metrics.trendStrength + metrics.correlationStability) / 2;
      confidence = (volatilitySignal + structureSignal) / 2;
    } else if (regime === MarketRegime.UNFAVORABLE) {
      // High confidence if choppy and unstructured
      const choppySignal = metrics.realizedVolatility < 0.005 ? 1 : 0;
      const unstructuredSignal = (1 - metrics.trendStrength) * (1 - metrics.correlationStability);
      confidence = (choppySignal + unstructuredSignal) / 2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate explainable reason for regime
   */
  private explainRegime(regime: MarketRegime, metrics: RegimeMetrics, confidence: number): string {
    if (regime === MarketRegime.UNKNOWN) {
      return `Insufficient confidence (${(confidence * 100).toFixed(0)}%) to determine regime. Defaulting to safety.`;
    }

    const parts: string[] = [];

    if (regime === MarketRegime.FAVORABLE) {
      parts.push(`Volatility: ${(metrics.realizedVolatility * 100).toFixed(2)}%`);
      if (metrics.volatilityExpansion > 0) {
        parts.push(`Expanding (+${(metrics.volatilityExpansion * 100).toFixed(1)}%)`);
      }
      parts.push(`Trend strength: ${(metrics.trendStrength * 100).toFixed(0)}%`);
      parts.push(`Structure stability: ${(metrics.correlationStability * 100).toFixed(0)}%`);
      return `FAVORABLE regime (${(confidence * 100).toFixed(0)}% confidence): ${parts.join(', ')}`;
    }

    if (regime === MarketRegime.UNFAVORABLE) {
      parts.push(`Low volatility: ${(metrics.realizedVolatility * 100).toFixed(2)}%`);
      if (metrics.volatilityExpansion < 0) {
        parts.push(`Contracting (${(metrics.volatilityExpansion * 100).toFixed(1)}%)`);
      }
      parts.push(`Weak trend: ${(metrics.trendStrength * 100).toFixed(0)}%`);
      parts.push(`Unstable structure: ${(metrics.correlationStability * 100).toFixed(0)}%`);
      return `UNFAVORABLE regime (${(confidence * 100).toFixed(0)}% confidence): ${parts.join(', ')}`;
    }

    return `UNKNOWN regime: Insufficient data or unclear signals`;
  }
}

