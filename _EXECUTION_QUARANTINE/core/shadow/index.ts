/**
 * Shadow Trading Module
 * 
 * PHASE 9: Shadow Trading & Execution Parity
 * 
 * Exports shadow trading components for use in governance system.
 */

export { ShadowExecutionTracker } from './shadow_execution_tracker';
export { ParityMetricsEngine, ParityMetrics } from './parity_metrics';
export { ParitySummaryGenerator, ParitySummary } from './parity_summary';
export { ShadowConfig, DEFAULT_SHADOW_CONFIG } from './shadow_config';
export type { ObservedMarketSnapshot, ShadowExecutionRecord } from './shadow_execution_tracker';




