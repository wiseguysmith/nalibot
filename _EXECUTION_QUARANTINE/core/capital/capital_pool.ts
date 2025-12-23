/**
 * Capital Pool Architecture
 * 
 * PHASE 3: Capital Intelligence & Governance
 * 
 * Capital pools are isolated by strategy type.
 * Losses in one pool do NOT affect the other.
 * Reporting remains independent.
 */

export enum CapitalPoolType {
  DIRECTIONAL = 'DIRECTIONAL',
  ARBITRAGE = 'ARBITRAGE'
}

export interface CapitalPoolMetrics {
  totalCapital: number;
  allocatedCapital: number;
  availableCapital: number;
  maxDrawdown: number; // Maximum allowed drawdown percentage
  currentDrawdown: number; // Current drawdown percentage
  peakCapital: number; // Highest capital level reached
}

/**
 * Capital Pool
 * 
 * Isolated pool of capital for a specific strategy type.
 * Tracks allocation, drawdown, and availability.
 */
export class CapitalPool {
  private poolType: CapitalPoolType;
  private metrics: CapitalPoolMetrics;
  private initialCapital: number;

  constructor(
    poolType: CapitalPoolType,
    initialCapital: number,
    maxDrawdown: number = 20 // 20% default max drawdown
  ) {
    this.poolType = poolType;
    this.initialCapital = initialCapital;
    this.metrics = {
      totalCapital: initialCapital,
      allocatedCapital: 0,
      availableCapital: initialCapital,
      maxDrawdown,
      currentDrawdown: 0,
      peakCapital: initialCapital
    };
  }

  /**
   * Get pool type
   */
  getPoolType(): CapitalPoolType {
    return this.poolType;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CapitalPoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Allocate capital to a strategy
   * 
   * @param amount Amount to allocate
   * @returns Actual amount allocated (may be less if insufficient capital)
   */
  allocateCapital(amount: number): number {
    const available = this.metrics.availableCapital;
    const actualAllocation = Math.min(amount, available);

    this.metrics.allocatedCapital += actualAllocation;
    this.metrics.availableCapital -= actualAllocation;

    return actualAllocation;
  }

  /**
   * Release capital back to pool
   * 
   * @param amount Amount to release
   */
  releaseCapital(amount: number): void {
    const releaseAmount = Math.min(amount, this.metrics.allocatedCapital);
    this.metrics.allocatedCapital -= releaseAmount;
    this.metrics.availableCapital += releaseAmount;
  }

  /**
   * Update pool capital based on P&L
   * 
   * @param pnl Profit/Loss in USD
   */
  updateCapital(pnl: number): void {
    this.metrics.totalCapital += pnl;
    this.metrics.availableCapital += pnl;

    // Update peak capital
    if (this.metrics.totalCapital > this.metrics.peakCapital) {
      this.metrics.peakCapital = this.metrics.totalCapital;
    }

    // Calculate drawdown
    const drawdown = ((this.metrics.peakCapital - this.metrics.totalCapital) / this.metrics.peakCapital) * 100;
    this.metrics.currentDrawdown = Math.max(0, drawdown);
  }

  /**
   * Check if pool has exceeded max drawdown
   */
  hasExceededMaxDrawdown(): boolean {
    return this.metrics.currentDrawdown >= this.metrics.maxDrawdown;
  }

  /**
   * Get available capital for allocation
   */
  getAvailableCapital(): number {
    return Math.max(0, this.metrics.availableCapital);
  }

  /**
   * Check if pool can allocate capital
   */
  canAllocate(amount: number): boolean {
    return this.metrics.availableCapital >= amount && !this.hasExceededMaxDrawdown();
  }

  /**
   * Reset pool to initial state (for testing/recovery)
   */
  reset(initialCapital?: number): void {
    const capital = initialCapital ?? this.initialCapital;
    this.initialCapital = capital;
    this.metrics = {
      totalCapital: capital,
      allocatedCapital: 0,
      availableCapital: capital,
      maxDrawdown: this.metrics.maxDrawdown,
      currentDrawdown: 0,
      peakCapital: capital
    };
  }
}

