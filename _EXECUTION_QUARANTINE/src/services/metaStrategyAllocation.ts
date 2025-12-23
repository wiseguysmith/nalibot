import { StrategyPerformance } from '../types/index';

export interface StrategyScore {
  name: string;
  sharpeRatio: number;
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  volatility: number;
  exposure: number;
  compositeScore: number;
  recommendedAllocation: number;
}

export interface AllocationDecision {
  timestamp: Date;
  strategyAllocations: { [strategyName: string]: number };
  reason: string;
  confidence: number;
  marketRegime: string;
  totalScore: number;
}

export class MetaStrategyAllocation {
  private allocationHistory: AllocationDecision[] = [];
  private strategyScores: StrategyScore[] = [];
  private reallocationFrequency: number = 7; // days
  private lastReallocation: Date = new Date();

  /**
   * Calculate strategy scores and recommend allocations
   */
  calculateStrategyAllocations(strategies: StrategyPerformance[], marketRegime: string): AllocationDecision {
    console.log('🧠 Calculating meta-strategy allocations...');
    
    // Calculate individual strategy scores
    this.strategyScores = strategies.map(strategy => this.calculateStrategyScore(strategy));
    
    // Sort by composite score
    this.strategyScores.sort((a, b) => b.compositeScore - a.compositeScore);
    
    // Calculate recommended allocations
    const totalScore = this.strategyScores.reduce((sum, score) => sum + score.compositeScore, 0);
    
    this.strategyScores.forEach(score => {
      score.recommendedAllocation = totalScore > 0 ? (score.compositeScore / totalScore) * 100 : 0;
    });
    
    // Apply market regime adjustments
    this.adjustForMarketRegime(marketRegime);
    
    // Apply risk constraints
    this.applyRiskConstraints();
    
    // Create allocation decision
    const strategyAllocations: { [strategyName: string]: number } = {};
    this.strategyScores.forEach(score => {
      strategyAllocations[score.name] = score.recommendedAllocation;
    });
    
    const decision: AllocationDecision = {
      timestamp: new Date(),
      strategyAllocations,
      reason: this.generateAllocationReason(),
      confidence: this.calculateConfidence(),
      marketRegime,
      totalScore
    };
    
    this.allocationHistory.push(decision);
    this.lastReallocation = new Date();
    
    console.log('✅ Meta-strategy allocation calculated');
    console.log('📊 Top strategies:', this.strategyScores.slice(0, 3).map(s => `${s.name}: ${s.recommendedAllocation.toFixed(1)}%`));
    
    return decision;
  }

  /**
   * Calculate composite score for a strategy
   */
  private calculateStrategyScore(strategy: StrategyPerformance): StrategyScore {
    // Normalize metrics to 0-1 scale
    const sharpeRatio = Math.max(0, Math.min(strategy.sharpeRatio || 0, 3)) / 3;
    const totalReturn = Math.max(-0.5, Math.min(strategy.totalPnL / 1000, 1)); // Normalize to -50% to +100%
    const maxDrawdown = Math.max(0, 1 - Math.abs(strategy.maxDrawdown || 0) / 0.2); // 20% max drawdown = 0 score
    const winRate = (strategy.winRate || 0) / 100;
    const profitFactor = Math.max(0, Math.min(strategy.profitFactor || 0, 3)) / 3;
    const volatility = Math.max(0, 1 - (strategy.volatility || 0) / 0.5); // Lower volatility = higher score
    const exposure = strategy.exposure || 0.5; // Time in market
    
    // Weighted composite score
    const compositeScore = (
      sharpeRatio * 0.25 +
      totalReturn * 0.20 +
      maxDrawdown * 0.15 +
      winRate * 0.15 +
      profitFactor * 0.10 +
      volatility * 0.10 +
      exposure * 0.05
    );
    
    return {
      name: strategy.name,
      sharpeRatio: strategy.sharpeRatio || 0,
      totalReturn: strategy.totalPnL || 0,
      maxDrawdown: strategy.maxDrawdown || 0,
      winRate: strategy.winRate || 0,
      profitFactor: strategy.profitFactor || 0,
      volatility: strategy.volatility || 0,
      exposure: strategy.exposure || 0,
      compositeScore,
      recommendedAllocation: 0
    };
  }

  /**
   * Adjust allocations based on market regime
   */
  private adjustForMarketRegime(marketRegime: string): void {
    console.log(`🌍 Adjusting allocations for ${marketRegime} market regime`);
    
    switch (marketRegime) {
      case 'trending':
        // Favor trend-following strategies
        this.strategyScores.forEach(score => {
          if (score.name.includes('Trend') || score.name.includes('Momentum')) {
            score.recommendedAllocation *= 1.3;
          } else if (score.name.includes('Mean Reversion') || score.name.includes('Grid')) {
            score.recommendedAllocation *= 0.7;
          }
        });
        break;
        
      case 'ranging':
        // Favor mean reversion and grid strategies
        this.strategyScores.forEach(score => {
          if (score.name.includes('Mean Reversion') || score.name.includes('Grid')) {
            score.recommendedAllocation *= 1.3;
          } else if (score.name.includes('Trend') || score.name.includes('Momentum')) {
            score.recommendedAllocation *= 0.7;
          }
        });
        break;
        
      case 'volatile':
        // Favor defensive and arbitrage strategies
        this.strategyScores.forEach(score => {
          if (score.name.includes('Defensive') || score.name.includes('Arbitrage')) {
            score.recommendedAllocation *= 1.4;
          } else if (score.name.includes('Scalping') || score.name.includes('Momentum')) {
            score.recommendedAllocation *= 0.6;
          }
        });
        break;
        
      default:
        // No adjustments for unknown regime
        break;
    }
  }

  /**
   * Apply risk constraints to allocations
   */
  private applyRiskConstraints(): void {
    // Ensure no single strategy gets more than 40% allocation
    this.strategyScores.forEach(score => {
      if (score.recommendedAllocation > 40) {
        const excess = score.recommendedAllocation - 40;
        score.recommendedAllocation = 40;
        
        // Redistribute excess to other strategies
        const otherStrategies = this.strategyScores.filter(s => s.name !== score.name);
        const totalOtherScore = otherStrategies.reduce((sum, s) => sum + s.compositeScore, 0);
        
        if (totalOtherScore > 0) {
          otherStrategies.forEach(s => {
            s.recommendedAllocation += (excess * s.compositeScore) / totalOtherScore;
          });
        }
      }
    });
    
    // Ensure minimum 5% allocation for diversification
    this.strategyScores.forEach(score => {
      if (score.recommendedAllocation < 5 && score.compositeScore > 0.3) {
        score.recommendedAllocation = 5;
      }
    });
    
    // Normalize to 100%
    const totalAllocation = this.strategyScores.reduce((sum, score) => sum + score.recommendedAllocation, 0);
    if (totalAllocation > 0) {
      this.strategyScores.forEach(score => {
        score.recommendedAllocation = (score.recommendedAllocation / totalAllocation) * 100;
      });
    }
  }

  /**
   * Generate human-readable reason for allocation
   */
  private generateAllocationReason(): string {
    const topStrategy = this.strategyScores[0];
    const secondStrategy = this.strategyScores[1];
    
    let reason = `Top performer: ${topStrategy.name} (${topStrategy.recommendedAllocation.toFixed(1)}%)`;
    
    if (secondStrategy && secondStrategy.recommendedAllocation > 15) {
      reason += `, ${secondStrategy.name} (${secondStrategy.recommendedAllocation.toFixed(1)}%)`;
    }
    
    reason += `. ${topStrategy.name} shows strong ${this.getBestMetric(topStrategy)} performance.`;
    
    return reason;
  }

  /**
   * Get the best performing metric for a strategy
   */
  private getBestMetric(score: StrategyScore): string {
    const metrics = [
      { name: 'Sharpe ratio', value: score.sharpeRatio },
      { name: 'win rate', value: score.winRate },
      { name: 'profit factor', value: score.profitFactor },
      { name: 'risk-adjusted returns', value: score.compositeScore }
    ];
    
    const bestMetric = metrics.reduce((best, current) => 
      current.value > best.value ? current : best
    );
    
    return bestMetric.name;
  }

  /**
   * Calculate confidence in allocation decision
   */
  private calculateConfidence(): number {
    if (this.strategyScores.length === 0) return 0;
    
    // Higher confidence if top strategy is clearly better
    const topScore = this.strategyScores[0].compositeScore;
    const avgScore = this.strategyScores.reduce((sum, s) => sum + s.compositeScore, 0) / this.strategyScores.length;
    
    const scoreSpread = (topScore - avgScore) / avgScore;
    const baseConfidence = Math.min(scoreSpread * 0.5 + 0.5, 1);
    
    // Higher confidence if we have more historical data
    const historyBonus = Math.min(this.allocationHistory.length * 0.05, 0.2);
    
    return Math.min(baseConfidence + historyBonus, 1);
  }

  /**
   * Check if reallocation is needed
   */
  shouldReallocate(): boolean {
    const daysSinceLastReallocation = (new Date().getTime() - this.lastReallocation.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastReallocation >= this.reallocationFrequency;
  }

  /**
   * Get allocation history
   */
  getAllocationHistory(): AllocationDecision[] {
    return this.allocationHistory;
  }

  /**
   * Get current strategy scores
   */
  getStrategyScores(): StrategyScore[] {
    return this.strategyScores;
  }

  /**
   * Set reallocation frequency
   */
  setReallocationFrequency(days: number): void {
    this.reallocationFrequency = days;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    if (this.allocationHistory.length === 0) {
      return { message: 'No allocation history available' };
    }
    
    const recentDecisions = this.allocationHistory.slice(-5);
    const avgConfidence = recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length;
    
    return {
      totalDecisions: this.allocationHistory.length,
      averageConfidence: avgConfidence,
      lastReallocation: this.lastReallocation,
      nextReallocation: new Date(this.lastReallocation.getTime() + this.reallocationFrequency * 24 * 60 * 60 * 1000),
      topStrategies: this.strategyScores.slice(0, 3).map(s => ({
        name: s.name,
        allocation: s.recommendedAllocation,
        score: s.compositeScore
      }))
    };
  }
}

export const metaStrategyAllocation = new MetaStrategyAllocation(); 