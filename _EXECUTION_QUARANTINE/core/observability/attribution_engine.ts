/**
 * Per-Layer Attribution Engine
 * 
 * PHASE 4: Observability, Attribution & Replay
 * 
 * Attributes outcomes to layers, not just strategies.
 * This allows honest performance diagnosis and non-emotional tuning.
 * 
 * Layers:
 * - Capital layer: Was trade blocked due to insufficient capital?
 * - Regime layer: Was trade blocked due to regime mismatch?
 * - Risk layer: Was trade blocked due to drawdown or limits?
 * - Execution layer: Slippage, fills, failures
 */

import { EventLog, EventType, TradeBlockedEvent, TradeExecutedEvent } from './event_log';

export interface AttributionResult {
  tradeId: string;
  strategyId: string;
  pair: string;
  timestamp: Date;
  
  // Layer decisions
  capitalLayer: {
    checked: boolean;
    allowed: boolean;
    reason?: string;
    allocatedCapital?: number;
    requestedAmount?: number;
  };
  
  regimeLayer: {
    checked: boolean;
    allowed: boolean;
    reason?: string;
    currentRegime?: string;
    allowedRegimes?: string[];
  };
  
  permissionLayer: {
    checked: boolean;
    allowed: boolean;
    reason?: string;
    tradingAllowed?: boolean;
  };
  
  riskLayer: {
    checked: boolean;
    allowed: boolean;
    reason?: string;
    riskState?: string;
    drawdown?: number;
  };
  
  executionLayer: {
    executed: boolean;
    orderId?: string;
    executedValue?: number;
    slippage?: number;
    fees?: number;
  };
  
  // Final outcome
  finalOutcome: 'EXECUTED' | 'BLOCKED';
  blockingLayer?: 'CAPITAL' | 'REGIME' | 'PERMISSION' | 'RISK';
  
  // Attribution summary
  attribution: {
    layer: string;
    reason: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  };
}

/**
 * Attribution Engine
 * 
 * Analyzes events to attribute outcomes to specific layers.
 */
export class AttributionEngine {
  /**
   * Attribute a trade outcome to layers
   */
  attributeTrade(
    eventLog: EventLog,
    strategyId: string,
    pair: string,
    timestamp: Date
  ): AttributionResult | null {
    // Find all relevant events for this trade
    const events = eventLog.getEventsInRange(
      new Date(timestamp.getTime() - 1000), // 1 second before
      new Date(timestamp.getTime() + 1000)  // 1 second after
    ).filter(
      e => e.strategyId === strategyId && 
           (e.eventType === EventType.CAPITAL_CHECK ||
            e.eventType === EventType.REGIME_CHECK ||
            e.eventType === EventType.PERMISSION_CHECK ||
            e.eventType === EventType.RISK_CHECK ||
            e.eventType === EventType.TRADE_EXECUTED ||
            e.eventType === EventType.TRADE_BLOCKED)
    );

    if (events.length === 0) {
      return null;
    }

    // Extract layer decisions
    const capitalCheck = events.find(e => e.eventType === EventType.CAPITAL_CHECK) as any;
    const regimeCheck = events.find(e => e.eventType === EventType.REGIME_CHECK) as any;
    const permissionCheck = events.find(e => e.eventType === EventType.PERMISSION_CHECK) as any;
    const riskCheck = events.find(e => e.eventType === EventType.RISK_CHECK) as any;
    const tradeExecuted = events.find(e => e.eventType === EventType.TRADE_EXECUTED) as any;
    const tradeBlocked = events.find(e => e.eventType === EventType.TRADE_BLOCKED) as any;

    // Build attribution result
    const result: AttributionResult = {
      tradeId: tradeExecuted?.orderId || tradeBlocked?.eventId || 'unknown',
      strategyId,
      pair,
      timestamp,
      
      capitalLayer: {
        checked: !!capitalCheck,
        allowed: capitalCheck?.allowed ?? false,
        reason: capitalCheck?.reason,
        allocatedCapital: capitalCheck?.allocatedCapital,
        requestedAmount: capitalCheck?.requestedAmount
      },
      
      regimeLayer: {
        checked: !!regimeCheck,
        allowed: regimeCheck?.allowed ?? false,
        reason: regimeCheck?.reason,
        currentRegime: regimeCheck?.currentRegime,
        allowedRegimes: regimeCheck?.allowedRegimes
      },
      
      permissionLayer: {
        checked: !!permissionCheck,
        allowed: permissionCheck?.allowed ?? false,
        reason: permissionCheck?.reason,
        tradingAllowed: permissionCheck?.tradingAllowed
      },
      
      riskLayer: {
        checked: !!riskCheck,
        allowed: riskCheck?.allowed ?? false,
        reason: riskCheck?.reason,
        riskState: riskCheck?.riskState,
        drawdown: riskCheck?.drawdown
      },
      
      executionLayer: {
        executed: !!tradeExecuted,
        orderId: tradeExecuted?.orderId,
        executedValue: tradeExecuted?.executedValue,
        slippage: tradeExecuted?.metadata?.slippage,
        fees: tradeExecuted?.metadata?.fees
      },
      
      finalOutcome: tradeExecuted ? 'EXECUTED' : 'BLOCKED',
      blockingLayer: tradeBlocked?.blockingLayer
    };

    // Determine attribution
    if (result.finalOutcome === 'BLOCKED') {
      result.attribution = {
        layer: result.blockingLayer || 'UNKNOWN',
        reason: result[`${result.blockingLayer?.toLowerCase()}Layer` as keyof AttributionResult]?.reason || 'Unknown reason',
        impact: 'NEGATIVE'
      };
    } else {
      // Trade executed - attribute to execution layer
      result.attribution = {
        layer: 'EXECUTION',
        reason: 'Trade executed successfully',
        impact: 'POSITIVE'
      };
    }

    return result;
  }

  /**
   * Get attribution summary for a time period
   */
  getAttributionSummary(
    eventLog: EventLog,
    startDate: Date,
    endDate: Date
  ): {
    totalTrades: number;
    executed: number;
    blocked: number;
    blockingBreakdown: {
      CAPITAL: number;
      REGIME: number;
      PERMISSION: number;
      RISK: number;
    };
    layerPerformance: {
      capital: { checks: number; blocks: number };
      regime: { checks: number; blocks: number };
      permission: { checks: number; blocks: number };
      risk: { checks: number; blocks: number };
    };
  } {
    const events = eventLog.getEventsInRange(startDate, endDate);
    
    const executed = events.filter(e => e.eventType === EventType.TRADE_EXECUTED).length;
    const blocked = events.filter(e => e.eventType === EventType.TRADE_BLOCKED).length;
    
    const blockingBreakdown = {
      CAPITAL: 0,
      REGIME: 0,
      PERMISSION: 0,
      RISK: 0
    };

    events
      .filter(e => e.eventType === EventType.TRADE_BLOCKED)
      .forEach(event => {
        const blockedEvent = event as any;
        if (blockedEvent.blockingLayer) {
          blockingBreakdown[blockedEvent.blockingLayer as keyof typeof blockingBreakdown]++;
        }
      });

    const layerPerformance = {
      capital: {
        checks: events.filter(e => e.eventType === EventType.CAPITAL_CHECK).length,
        blocks: events.filter(e => e.eventType === EventType.CAPITAL_CHECK && !(e as any).allowed).length
      },
      regime: {
        checks: events.filter(e => e.eventType === EventType.REGIME_CHECK).length,
        blocks: events.filter(e => e.eventType === EventType.REGIME_CHECK && !(e as any).allowed).length
      },
      permission: {
        checks: events.filter(e => e.eventType === EventType.PERMISSION_CHECK).length,
        blocks: events.filter(e => e.eventType === EventType.PERMISSION_CHECK && !(e as any).allowed).length
      },
      risk: {
        checks: events.filter(e => e.eventType === EventType.RISK_CHECK).length,
        blocks: events.filter(e => e.eventType === EventType.RISK_CHECK && !(e as any).allowed).length
      }
    };

    return {
      totalTrades: executed + blocked,
      executed,
      blocked,
      blockingBreakdown,
      layerPerformance
    };
  }
}

