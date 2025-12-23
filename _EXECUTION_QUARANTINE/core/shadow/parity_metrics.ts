/**
 * Parity Metrics Engine
 * 
 * PHASE 9: Shadow Trading & Execution Parity
 * 
 * Computes divergence metrics between simulated execution and observed
 * market outcomes.
 */

import { TradeRequest, TradeResult } from '../../src/services/riskGovernor';
import { ObservedMarketSnapshot } from './shadow_execution_tracker';

export interface ParityMetrics {
  /**
   * Execution price error
   * Difference between simulated execution price and observed price at latency timestamp
   */
  executionPriceError: number;
  executionPriceErrorPct: number;

  /**
   * Slippage error
   * Difference between simulated slippage and observed slippage
   */
  slippageError: number;
  slippageErrorPct: number;

  /**
   * Fill probability mismatch
   * Whether simulated fill would have occurred in observed market
   * 1.0 = perfect match, 0.0 = complete mismatch
   */
  fillProbabilityMatch: number;

  /**
   * Latency sensitivity
   * Price change between decision time and latency timestamp
   */
  latencySensitivity: number;
  latencySensitivityPct: number;

  /**
   * Funding drift
   * Change in funding rate during observation window (if applicable)
   */
  fundingDrift?: number;

  /**
   * Simulated vs observed PnL delta
   * Difference in PnL if trade had executed at observed prices
   */
  pnlDelta: number;
  pnlDeltaPct: number;

  /**
   * Horizon performance
   * Price movement during observation window
   */
  horizonPerformance: number;
  horizonPerformancePct: number;
}

/**
 * Parity Metrics Engine
 * 
 * Computes metrics comparing simulated execution to observed market outcomes.
 */
export class ParityMetricsEngine {
  /**
   * Compute parity metrics
   */
  computeMetrics(
    request: TradeRequest,
    simulatedResult: TradeResult,
    decisionSnapshot: ObservedMarketSnapshot,
    latencySnapshot: ObservedMarketSnapshot,
    finalSnapshot: ObservedMarketSnapshot
  ): ParityMetrics {
    const simulatedPrice = simulatedResult.executionPrice || request.price;
    const observedPriceAtLatency = latencySnapshot.price;
    const observedPriceAtDecision = decisionSnapshot.price;
    const observedPriceAtFinal = finalSnapshot.price;

    // Execution price error
    const executionPriceError = simulatedPrice - observedPriceAtLatency;
    const executionPriceErrorPct = (executionPriceError / observedPriceAtLatency) * 100;

    // Slippage error
    const simulatedSlippage = (simulatedResult as any).slippage || 0;
    const observedSlippage = Math.abs(observedPriceAtLatency - observedPriceAtDecision);
    const slippageError = simulatedSlippage - observedSlippage;
    const slippageErrorPct = observedSlippage > 0 
      ? (slippageError / observedSlippage) * 100 
      : 0;

    // Fill probability match
    // Check if simulated fill would have occurred at observed prices
    const fillProbabilityMatch = this.computeFillProbabilityMatch(
      request,
      simulatedResult,
      decisionSnapshot,
      latencySnapshot
    );

    // Latency sensitivity
    const latencySensitivity = observedPriceAtLatency - observedPriceAtDecision;
    const latencySensitivityPct = (latencySensitivity / observedPriceAtDecision) * 100;

    // PnL delta
    const simulatedPnL = simulatedResult.pnl || 0;
    const observedPnL = this.computeObservedPnL(
      request,
      observedPriceAtLatency,
      finalSnapshot.price
    );
    const pnlDelta = simulatedPnL - observedPnL;
    const pnlDeltaPct = observedPnL !== 0 ? (pnlDelta / Math.abs(observedPnL)) * 100 : 0;

    // Horizon performance
    const horizonPerformance = observedPriceAtFinal - observedPriceAtDecision;
    const horizonPerformancePct = (horizonPerformance / observedPriceAtDecision) * 100;

    return {
      executionPriceError,
      executionPriceErrorPct,
      slippageError,
      slippageErrorPct,
      fillProbabilityMatch,
      latencySensitivity,
      latencySensitivityPct,
      pnlDelta,
      pnlDeltaPct,
      horizonPerformance,
      horizonPerformancePct
    };
  }

  /**
   * Compute fill probability match
   * 
   * Determines how likely the simulated fill would have occurred
   * given observed market conditions.
   */
  private computeFillProbabilityMatch(
    request: TradeRequest,
    simulatedResult: TradeResult,
    decisionSnapshot: ObservedMarketSnapshot,
    latencySnapshot: ObservedMarketSnapshot
  ): number {
    // Check if order would have filled at observed prices
    const isBuy = request.action === 'buy';
    const simulatedFilled = simulatedResult.success && (simulatedResult.quantity || 0) > 0;
    
    if (!simulatedFilled) {
      // If simulated didn't fill, check if observed market would have filled
      return 1.0; // Perfect match (both didn't fill)
    }

    // Check if observed market conditions would allow fill
    const observedPrice = isBuy ? latencySnapshot.ask : latencySnapshot.bid;
    const requestedPrice = request.price;
    
    if (isBuy) {
      // Buy order fills if ask price <= requested price
      const wouldFill = observedPrice <= requestedPrice;
      return wouldFill ? 1.0 : 0.5; // Partial match if price moved away
    } else {
      // Sell order fills if bid price >= requested price
      const wouldFill = observedPrice >= requestedPrice;
      return wouldFill ? 1.0 : 0.5; // Partial match if price moved away
    }
  }

  /**
   * Compute observed PnL
   * 
   * Calculates what PnL would have been if trade executed at observed prices.
   */
  private computeObservedPnL(
    request: TradeRequest,
    entryPrice: number,
    exitPrice: number
  ): number {
    const quantity = request.amount;
    const isBuy = request.action === 'buy';
    
    if (isBuy) {
      // Buy: profit if exit > entry
      return (exitPrice - entryPrice) * quantity;
    } else {
      // Sell: profit if entry > exit
      return (entryPrice - exitPrice) * quantity;
    }
  }
}




