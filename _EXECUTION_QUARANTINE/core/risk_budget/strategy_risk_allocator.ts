/**
 * Strategy Risk Allocator
 * 
 * PHASE 8: Formal Risk Budgeting
 * 
 * Distributes account risk budget across enabled strategies.
 * Weights are based on:
 * - Recent performance
 * - Drawdown contribution
 * - Stability metrics
 * 
 * Rules:
 * - Poorly performing strategies get less risk
 * - New strategies start at minimal weight
 * - Strategies in probation get zero allocation
 * - Allocation always sums to ≤ account risk budget
 * - No strategy can self-allocate
 */

import { AccountRiskBudget } from './account_risk_budget';
import { StrategyState } from '../strategy_metadata';

export interface StrategyPerformanceMetrics {
  strategyId: string;
  recentPnL: number; // Recent P&L (e.g., last 30 days)
  drawdownContribution: number; // Contribution to account drawdown
  stabilityScore: number; // Stability score (0-1, higher = more stable)
  tradeCount: number; // Number of trades executed
  winRate: number; // Win rate (0-1)
  state: StrategyState;
}

export interface StrategyRiskAllocation {
  strategyId: string;
  allocatedRiskPct: number; // Risk percentage allocated to this strategy
  weight: number; // Weight in allocation (0-1)
  performanceScore: number; // Performance score used for allocation
}

/**
 * Strategy Risk Allocator
 * 
 * Allocates account risk budget across strategies based on performance.
 */
export class StrategyRiskAllocator {
  private accountRiskBudget: AccountRiskBudget;
  private strategyMetrics: Map<string, StrategyPerformanceMetrics> = new Map();
  private allocations: Map<string, StrategyRiskAllocation> = new Map();

  // Configuration
  private minAllocationPct: number = 0.1; // Minimum allocation for new strategies (0.1%)
  private probationAllocationPct: number = 0; // Zero allocation for strategies in probation
  private performanceLookbackDays: number = 30; // Days to look back for performance

  constructor(accountRiskBudget: AccountRiskBudget) {
    this.accountRiskBudget = accountRiskBudget;
  }

  /**
   * Update strategy performance metrics
   */
  updateStrategyMetrics(metrics: StrategyPerformanceMetrics): void {
    this.strategyMetrics.set(metrics.strategyId, metrics);
    this.recalculateAllocations();
  }

  /**
   * Update multiple strategy metrics
   */
  updateStrategyMetricsBatch(metrics: StrategyPerformanceMetrics[]): void {
    metrics.forEach(m => this.strategyMetrics.set(m.strategyId, m));
    this.recalculateAllocations();
  }

  /**
   * Get risk allocation for a strategy
   */
  getAllocation(strategyId: string): StrategyRiskAllocation | undefined {
    return this.allocations.get(strategyId);
  }

  /**
   * Get all allocations
   */
  getAllAllocations(): StrategyRiskAllocation[] {
    return Array.from(this.allocations.values());
  }

  /**
   * Check if strategy has allocated risk
   */
  hasAllocation(strategyId: string): boolean {
    const allocation = this.allocations.get(strategyId);
    return allocation !== undefined && allocation.allocatedRiskPct > 0;
  }

  /**
   * Get total allocated risk
   */
  getTotalAllocatedRiskPct(): number {
    return Array.from(this.allocations.values())
      .reduce((sum, alloc) => sum + alloc.allocatedRiskPct, 0);
  }

  /**
   * Recalculate allocations based on current metrics
   */
  private recalculateAllocations(): void {
    const effectiveRiskPct = this.accountRiskBudget.getEffectiveRiskPct();
    const enabledStrategies = Array.from(this.strategyMetrics.values())
      .filter(m => m.state === StrategyState.ACTIVE || m.state === StrategyState.SIM);

    if (enabledStrategies.length === 0) {
      this.allocations.clear();
      return;
    }

    // Calculate performance scores for each strategy
    const performanceScores = new Map<string, number>();
    
    enabledStrategies.forEach(strategy => {
      // Strategies in probation get zero allocation
      if (strategy.state === StrategyState.PROBATION || strategy.state === StrategyState.PAUSED) {
        performanceScores.set(strategy.strategyId, 0);
        return;
      }

      // Calculate performance score
      // Factors:
      // - Recent P&L (normalized)
      // - Win rate
      // - Stability score
      // - Negative: drawdown contribution
      
      const pnlScore = this.normalizePnL(strategy.recentPnL);
      const winRateScore = strategy.winRate;
      const stabilityScore = strategy.stabilityScore;
      const drawdownPenalty = Math.min(1.0, strategy.drawdownContribution / 10); // Penalty for high drawdown contribution

      // Weighted combination
      const score = (
        pnlScore * 0.4 +
        winRateScore * 0.3 +
        stabilityScore * 0.2 -
        drawdownPenalty * 0.1
      );

      // Ensure score is non-negative
      performanceScores.set(strategy.strategyId, Math.max(0, score));
    });

    // Calculate total score for normalization
    const totalScore = Array.from(performanceScores.values())
      .reduce((sum, score) => sum + score, 0);

    // Allocate risk proportionally to performance scores
    const newAllocations = new Map<string, StrategyRiskAllocation>();

    if (totalScore > 0) {
      // Proportional allocation
      enabledStrategies.forEach(strategy => {
        const score = performanceScores.get(strategy.strategyId) || 0;
        const weight = score / totalScore;
        const allocatedRiskPct = effectiveRiskPct * weight;

        // Ensure minimum allocation for active strategies (unless in probation)
        const finalAllocation = strategy.state === StrategyState.PROBATION || strategy.state === StrategyState.PAUSED
          ? this.probationAllocationPct
          : Math.max(this.minAllocationPct, allocatedRiskPct);

        newAllocations.set(strategy.strategyId, {
          strategyId: strategy.strategyId,
          allocatedRiskPct: finalAllocation,
          weight,
          performanceScore: score
        });
      });
    } else {
      // All strategies have zero score - equal allocation
      const equalAllocation = effectiveRiskPct / enabledStrategies.length;
      enabledStrategies.forEach(strategy => {
        if (strategy.state !== StrategyState.PROBATION && strategy.state !== StrategyState.PAUSED) {
          newAllocations.set(strategy.strategyId, {
            strategyId: strategy.strategyId,
            allocatedRiskPct: Math.max(this.minAllocationPct, equalAllocation),
            weight: 1.0 / enabledStrategies.length,
            performanceScore: 0
          });
        }
      });
    }

    // Ensure total allocation doesn't exceed effective risk
    const totalAllocated = Array.from(newAllocations.values())
      .reduce((sum, alloc) => sum + alloc.allocatedRiskPct, 0);

    if (totalAllocated > effectiveRiskPct) {
      // Scale down proportionally
      const scaleFactor = effectiveRiskPct / totalAllocated;
      newAllocations.forEach(alloc => {
        alloc.allocatedRiskPct *= scaleFactor;
      });
    }

    this.allocations = newAllocations;

    console.log(`[STRATEGY_RISK_ALLOCATOR] Recalculated allocations: ${newAllocations.size} strategies, total=${this.getTotalAllocatedRiskPct().toFixed(2)}%`);
  }

  /**
   * Normalize P&L to score (0-1)
   * 
   * Positive P&L → higher score
   * Negative P&L → lower score
   */
  private normalizePnL(pnl: number): number {
    // Use sigmoid-like function to normalize
    // P&L of $1000 → score ~0.5
    // P&L of $2000 → score ~0.7
    // P&L of -$1000 → score ~0.3
    const normalized = 1 / (1 + Math.exp(-pnl / 1000));
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Get allocation summary
   */
  getSummary(): {
    totalEffectiveRiskPct: number;
    totalAllocatedRiskPct: number;
    allocations: StrategyRiskAllocation[];
  } {
    return {
      totalEffectiveRiskPct: this.accountRiskBudget.getEffectiveRiskPct(),
      totalAllocatedRiskPct: this.getTotalAllocatedRiskPct(),
      allocations: Array.from(this.allocations.values())
    };
  }
}

