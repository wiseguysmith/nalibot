/**
 * Append-Only Event Log
 * 
 * PHASE 4: Observability, Attribution & Replay
 * 
 * Foundation for observability - every decision generates an event.
 * Events are immutable, append-only, and auditable.
 * 
 * Rules:
 * - Events are append-only
 * - No deletes
 * - No overwrites
 * - No retroactive edits
 */

export enum EventType {
  SIGNAL_GENERATED = 'SIGNAL_GENERATED',
  CAPITAL_CHECK = 'CAPITAL_CHECK',
  REGIME_CHECK = 'REGIME_CHECK',
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  RISK_CHECK = 'RISK_CHECK',
  TRADE_EXECUTED = 'TRADE_EXECUTED',
  TRADE_BLOCKED = 'TRADE_BLOCKED',
  CAPITAL_UPDATE = 'CAPITAL_UPDATE',
  STRATEGY_STATE_CHANGE = 'STRATEGY_STATE_CHANGE',
  SYSTEM_MODE_CHANGE = 'SYSTEM_MODE_CHANGE',
  REGIME_DETECTED = 'REGIME_DETECTED',
  POOL_UPDATE = 'POOL_UPDATE',
  ARB_COMPLETED = 'ARB_COMPLETED',      // PHASE 6: Arbitrage completed
  ARB_ABORTED = 'ARB_ABORTED',          // PHASE 6: Arbitrage aborted
  RISK_BUDGET_INIT = 'RISK_BUDGET_INIT', // PHASE 8: Risk budget initialized
  RISK_BUDGET_SCALING = 'RISK_BUDGET_SCALING', // PHASE 8: Risk budget regime scaling
  RISK_BUDGET_DECAY = 'RISK_BUDGET_DECAY', // PHASE 8: Risk budget decay applied
  RISK_BUDGET_RECOVERY = 'RISK_BUDGET_RECOVERY', // PHASE 8: Risk budget recovery
  RISK_BUDGET_ALLOCATION = 'RISK_BUDGET_ALLOCATION', // PHASE 8: Strategy risk allocation changed
  RISK_BUDGET_CHECK = 'RISK_BUDGET_CHECK', // PHASE 8: Risk budget check
  SHADOW_TRADE_EVALUATED = 'SHADOW_TRADE_EVALUATED', // PHASE 9: Shadow trade evaluated
  SHADOW_PARITY_METRIC = 'SHADOW_PARITY_METRIC', // PHASE 9: Shadow parity metric computed
  CONFIDENCE_GATE_BLOCKED = 'CONFIDENCE_GATE_BLOCKED' // VALIDATION: Confidence gate blocked REAL execution
}

export interface BaseEvent {
  eventId: string; // Immutable unique identifier
  timestamp: Date;
  eventType: EventType;
  accountId?: string; // PHASE 7: Account-scoped events
  strategyId?: string;
  systemMode?: string;
  regime?: string;
  regimeConfidence?: number;
  capitalAllocation?: number;
  reason: string; // Human-readable explanation
  metadata?: Record<string, any>; // Additional context
}

export interface SignalGeneratedEvent extends BaseEvent {
  eventType: EventType.SIGNAL_GENERATED;
  signal: 'buy' | 'sell' | 'hold';
  pair: string;
  confidence?: number;
}

export interface CapitalCheckEvent extends BaseEvent {
  eventType: EventType.CAPITAL_CHECK;
  strategyId: string;
  requestedAmount: number;
  allocatedCapital: number;
  allowed: boolean;
  reason: string;
}

export interface RegimeCheckEvent extends BaseEvent {
  eventType: EventType.REGIME_CHECK;
  strategyId: string;
  currentRegime: string;
  allowedRegimes: string[];
  allowed: boolean;
  reason: string;
}

export interface PermissionCheckEvent extends BaseEvent {
  eventType: EventType.PERMISSION_CHECK;
  strategyId: string;
  tradingAllowed: boolean;
  allowed: boolean;
  reason: string;
}

export interface RiskCheckEvent extends BaseEvent {
  eventType: EventType.RISK_CHECK;
  strategyId: string;
  riskState: string;
  drawdown: number;
  allowed: boolean;
  reason: string;
}

export interface TradeExecutedEvent extends BaseEvent {
  eventType: EventType.TRADE_EXECUTED;
  strategyId: string;
  pair: string;
  action: 'buy' | 'sell';
  amount: number;
  executionType?: 'SIMULATED' | 'REAL'; // PHASE 8: Execution type metadata
  price: number;
  orderId?: string;
  executedValue: number;
}

export interface TradeBlockedEvent extends BaseEvent {
  eventType: EventType.TRADE_BLOCKED;
  strategyId: string;
  pair: string;
  blockingLayer: 'CAPITAL' | 'REGIME' | 'PERMISSION' | 'RISK';
  reason: string;
}

export interface CapitalUpdateEvent extends BaseEvent {
  eventType: EventType.CAPITAL_UPDATE;
  poolType: 'DIRECTIONAL' | 'ARBITRAGE';
  strategyId?: string;
  previousAllocation: number;
  newAllocation: number;
  reason: string;
}

export interface StrategyStateChangeEvent extends BaseEvent {
  eventType: EventType.STRATEGY_STATE_CHANGE;
  strategyId: string;
  previousState: string;
  newState: string;
  reason: string;
}

export interface SystemModeChangeEvent extends BaseEvent {
  eventType: EventType.SYSTEM_MODE_CHANGE;
  previousMode: string;
  newMode: string;
  reason: string;
}

export interface RegimeDetectedEvent extends BaseEvent {
  eventType: EventType.REGIME_DETECTED;
  symbol: string;
  regime: string;
  confidence: number;
  metrics: {
    realizedVolatility: number;
    volatilityExpansion: number;
    trendStrength: number;
    correlationStability: number;
  };
}

export interface RiskBudgetCheckEvent extends BaseEvent {
  eventType: EventType.RISK_BUDGET_CHECK;
  accountId: string;
  strategyId: string;
  requestedRiskPct: number;
  allocatedRiskPct: number;
  effectiveRiskPct: number;
  allowed: boolean;
  reason: string;
}

export interface RiskBudgetScalingEvent extends BaseEvent {
  eventType: EventType.RISK_BUDGET_SCALING;
  accountId: string;
  regime: string;
  confidence: number;
  previousScalingFactor: number;
  newScalingFactor: number;
}

export interface RiskBudgetDecayEvent extends BaseEvent {
  eventType: EventType.RISK_BUDGET_DECAY;
  accountId: string;
  drawdownPct: number;
  penaltyPct: number;
  previousRiskPct: number;
  newRiskPct: number;
}

export interface RiskBudgetRecoveryEvent extends BaseEvent {
  eventType: EventType.RISK_BUDGET_RECOVERY;
  accountId: string;
  daysSinceDrawdown: number;
  recoveryPct: number;
  previousRiskPct: number;
  newRiskPct: number;
}

export interface RiskBudgetAllocationEvent extends BaseEvent {
  eventType: EventType.RISK_BUDGET_ALLOCATION;
  accountId: string;
  strategyId: string;
  allocatedRiskPct: number;
  weight: number;
  performanceScore: number;
}

export interface ShadowTradeEvaluatedEvent extends BaseEvent {
  eventType: EventType.SHADOW_TRADE_EVALUATED;
  strategyId: string;
  pair: string;
  action: 'buy' | 'sell';
  simulatedExecutionPrice: number;
  observedPriceAtDecision: number;
  observedPriceAtLatency: number;
  trackingId: string;
  reason: string;
}

export interface ShadowParityMetricEvent extends BaseEvent {
  eventType: EventType.SHADOW_PARITY_METRIC;
  strategyId: string;
  pair: string;
  trackingId: string;
  executionPriceError: number;
  executionPriceErrorPct: number;
  slippageError: number;
  slippageErrorPct: number;
  fillProbabilityMatch: number;
  latencySensitivity: number;
  latencySensitivityPct: number;
  pnlDelta: number;
  pnlDeltaPct: number;
  horizonPerformance: number;
  horizonPerformancePct: number;
  reason: string;
}

export interface ConfidenceGateBlockedEvent extends BaseEvent {
  eventType: EventType.CONFIDENCE_GATE_BLOCKED;
  shadowTrades: number;
  requiredShadowTrades: number;
  runtimeDays: number;
  requiredRuntimeDays: number;
  confidenceScore: number;
  requiredConfidenceScore: number;
  allRegimesCovered: boolean;
  noUnsafeCombinations: boolean;
  blockingReasons: string[];
}

export type Event = 
  | SignalGeneratedEvent
  | CapitalCheckEvent
  | RegimeCheckEvent
  | PermissionCheckEvent
  | RiskCheckEvent
  | TradeExecutedEvent
  | TradeBlockedEvent
  | CapitalUpdateEvent
  | StrategyStateChangeEvent
  | SystemModeChangeEvent
  | RegimeDetectedEvent
  | RiskBudgetCheckEvent
  | RiskBudgetScalingEvent
  | RiskBudgetDecayEvent
  | RiskBudgetRecoveryEvent
  | RiskBudgetAllocationEvent
  | ShadowTradeEvaluatedEvent
  | ShadowParityMetricEvent
  | ConfidenceGateBlockedEvent;

/**
 * Event Log
 * 
 * Append-only log of all system events.
 * Immutable and auditable.
 */
export class EventLog {
  private events: Event[] = [];
  private maxEvents: number = 100000; // Prevent unbounded growth

  /**
   * Append an event to the log
   * 
   * Events are immutable - once appended, they cannot be modified.
   */
  append(event: Omit<Event, 'eventId' | 'timestamp'>): string {
    const eventId = this.generateEventId();
    const timestamp = new Date();

    const fullEvent: Event = {
      ...event,
      eventId,
      timestamp
    } as Event;

    // Append-only - no overwrites
    this.events.push(fullEvent);

    // Prevent unbounded growth (keep last N events)
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    return eventId;
  }

  /**
   * Get all events
   */
  getAllEvents(): ReadonlyArray<Event> {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: EventType): ReadonlyArray<Event> {
    return this.events.filter(e => e.eventType === eventType);
  }

  /**
   * Get events by strategy
   */
  getEventsByStrategy(strategyId: string): ReadonlyArray<Event> {
    return this.events.filter(e => e.strategyId === strategyId);
  }

  /**
   * Get events in time range
   */
  getEventsInRange(startDate: Date, endDate: Date): ReadonlyArray<Event> {
    return this.events.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );
  }

  /**
   * Get events for a specific day
   */
  getEventsForDay(date: Date): ReadonlyArray<Event> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getEventsInRange(startOfDay, endOfDay);
  }

  /**
   * Get recent events (last N)
   */
  getRecentEvents(count: number = 100): ReadonlyArray<Event> {
    return this.events.slice(-count);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `evt_${timestamp}_${random}`;
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Clear events (for testing only)
   */
  clear(): void {
    this.events = [];
  }
}

