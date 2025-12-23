import { BacktestResult } from './backtestingEngine';

export interface PerformanceMetrics {
  strategy: string;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  riskRewardRatio: number;
  calmarRatio: number;
  tradesPerMonth: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface StrategyComparison {
  bestPerformer: string;
  mostConsistent: string;
  lowestRisk: string;
  highestSharpe: string;
  recommendations: string[];
}

export class PerformanceAnalyzer {
  private riskFreeRate: number = 0.02; // 2% annual risk-free rate

  /**
   * Calculate comprehensive performance metrics for a strategy
   */
  calculateMetrics(result: BacktestResult): PerformanceMetrics {
    const returns = this.calculateReturns(result.equity);
    const volatility = this.calculateVolatility(returns);
    const annualizedReturn = this.calculateAnnualizedReturn(result.totalReturn, result.dates.length);
    const sortinoRatio = this.calculateSortinoRatio(returns, annualizedReturn);
    const profitFactor = this.calculateProfitFactor(result.trades);
    const averageWin = this.calculateAverageWin(result.trades);
    const averageLoss = this.calculateAverageLoss(result.trades);
    const riskRewardRatio = averageLoss !== 0 ? averageWin / Math.abs(averageLoss) : 0;
    const calmarRatio = result.maxDrawdown !== 0 ? annualizedReturn / (result.maxDrawdown / 100) : 0;
    const tradesPerMonth = this.calculateTradesPerMonth(result.totalTrades, result.dates.length);
    const consecutiveStats = this.calculateConsecutiveStats(result.trades);

    return {
      strategy: result.strategy,
      totalReturn: result.totalReturn,
      annualizedReturn,
      volatility: volatility * 100,
      sharpeRatio: result.sharpeRatio,
      sortinoRatio,
      maxDrawdown: result.maxDrawdown,
      winRate: result.winRate * 100,
      profitFactor,
      averageWin,
      averageLoss,
      riskRewardRatio,
      calmarRatio,
      tradesPerMonth,
      consecutiveWins: consecutiveStats.maxConsecutiveWins,
      consecutiveLosses: consecutiveStats.maxConsecutiveLosses
    };
  }

  /**
   * Calculate daily returns from equity curve
   */
  private calculateReturns(equity: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      const dailyReturn = (equity[i] - equity[i - 1]) / equity[i - 1];
      returns.push(dailyReturn);
    }
    return returns;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate annualized return
   */
  private calculateAnnualizedReturn(totalReturn: number, days: number): number {
    const dailyReturn = (1 + totalReturn / 100) ** (1 / days) - 1;
    return ((1 + dailyReturn) ** 365 - 1) * 100;
  }

  /**
   * Calculate Sortino ratio (downside deviation)
   */
  private calculateSortinoRatio(returns: number[], annualizedReturn: number): number {
    const negativeReturns = returns.filter(ret => ret < 0);
    if (negativeReturns.length === 0) return 0;

    const downsideDeviation = Math.sqrt(
      negativeReturns.reduce((sum, ret) => sum + ret * ret, 0) / negativeReturns.length
    );

    return downsideDeviation !== 0 ? (annualizedReturn / 100 - this.riskFreeRate) / downsideDeviation : 0;
  }

  /**
   * Calculate profit factor (gross profit / gross loss)
   */
  private calculateProfitFactor(trades: any[]): number {
    let grossProfit = 0;
    let grossLoss = 0;

    for (let i = 1; i < trades.length; i += 2) {
      if (trades[i] && trades[i - 1]) {
        const buyTrade = trades[i - 1];
        const sellTrade = trades[i];
        const profit = sellTrade.price - buyTrade.price;
        
        if (profit > 0) {
          grossProfit += profit;
        } else {
          grossLoss += Math.abs(profit);
        }
      }
    }

    return grossLoss !== 0 ? grossProfit / grossLoss : 0;
  }

  /**
   * Calculate average winning trade
   */
  private calculateAverageWin(trades: any[]): number {
    const winningTrades: number[] = [];

    for (let i = 1; i < trades.length; i += 2) {
      if (trades[i] && trades[i - 1]) {
        const buyTrade = trades[i - 1];
        const sellTrade = trades[i];
        const profit = sellTrade.price - buyTrade.price;
        
        if (profit > 0) {
          winningTrades.push(profit);
        }
      }
    }

    return winningTrades.length > 0 
      ? winningTrades.reduce((sum, profit) => sum + profit, 0) / winningTrades.length 
      : 0;
  }

  /**
   * Calculate average losing trade
   */
  private calculateAverageLoss(trades: any[]): number {
    const losingTrades: number[] = [];

    for (let i = 1; i < trades.length; i += 2) {
      if (trades[i] && trades[i - 1]) {
        const buyTrade = trades[i - 1];
        const sellTrade = trades[i];
        const profit = sellTrade.price - buyTrade.price;
        
        if (profit < 0) {
          losingTrades.push(Math.abs(profit));
        }
      }
    }

    return losingTrades.length > 0 
      ? losingTrades.reduce((sum, loss) => sum + loss, 0) / losingTrades.length 
      : 0;
  }

  /**
   * Calculate trades per month
   */
  private calculateTradesPerMonth(totalTrades: number, days: number): number {
    const months = days / 30;
    return months > 0 ? totalTrades / months : 0;
  }

  /**
   * Calculate consecutive wins and losses
   */
  private calculateConsecutiveStats(trades: any[]): { maxConsecutiveWins: number; maxConsecutiveLosses: number } {
    let currentWins = 0;
    let currentLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;

    for (let i = 1; i < trades.length; i += 2) {
      if (trades[i] && trades[i - 1]) {
        const buyTrade = trades[i - 1];
        const sellTrade = trades[i];
        const profit = sellTrade.price - buyTrade.price;
        
        if (profit > 0) {
          currentWins++;
          currentLosses = 0;
          maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
        } else {
          currentLosses++;
          currentWins = 0;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
        }
      }
    }

    return { maxConsecutiveWins, maxConsecutiveLosses };
  }

  /**
   * Compare multiple strategies and provide insights
   */
  compareStrategies(results: BacktestResult[]): StrategyComparison {
    const metrics = results.map(result => this.calculateMetrics(result));
    
    // Find best performers in different categories
    const bestPerformer = metrics.reduce((best, current) => 
      current.totalReturn > best.totalReturn ? current : best
    ).strategy;

    const mostConsistent = metrics.reduce((best, current) => 
      current.volatility < best.volatility ? current : best
    ).strategy;

    const lowestRisk = metrics.reduce((best, current) => 
      current.maxDrawdown < best.maxDrawdown ? current : best
    ).strategy;

    const highestSharpe = metrics.reduce((best, current) => 
      current.sharpeRatio > best.sharpeRatio ? current : best
    ).strategy;

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics);

    return {
      bestPerformer,
      mostConsistent,
      lowestRisk,
      highestSharpe,
      recommendations
    };
  }

  /**
   * Generate actionable recommendations based on performance
   */
  private generateRecommendations(metrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];

    // Analyze overall performance
    const avgReturn = metrics.reduce((sum, m) => sum + m.totalReturn, 0) / metrics.length;
    const avgSharpe = metrics.reduce((sum, m) => sum + m.sharpeRatio, 0) / metrics.length;

    if (avgReturn < 5) {
      recommendations.push('Overall returns are below 5%. Consider parameter optimization or adding new strategies.');
    }

    if (avgSharpe < 1) {
      recommendations.push('Risk-adjusted returns are low. Focus on reducing volatility and improving win rates.');
    }

    // Strategy-specific recommendations
    metrics.forEach(metric => {
      if (metric.winRate < 40) {
        recommendations.push(`${metric.strategy}: Low win rate (${metric.winRate.toFixed(1)}%). Review entry/exit criteria.`);
      }

      if (metric.maxDrawdown > 20) {
        recommendations.push(`${metric.strategy}: High drawdown (${metric.maxDrawdown.toFixed(1)}%). Implement stricter risk management.`);
      }

      if (metric.profitFactor < 1.2) {
        recommendations.push(`${metric.strategy}: Low profit factor (${metric.profitFactor.toFixed(2)}). Focus on improving risk/reward ratio.`);
      }

      if (metric.tradesPerMonth < 5) {
        recommendations.push(`${metric.strategy}: Low trading frequency (${metric.tradesPerMonth.toFixed(1)} trades/month). Consider adjusting sensitivity.`);
      }
    });

    return recommendations;
  }

  /**
   * Generate performance report
   */
  generateReport(results: BacktestResult[]): string {
    const comparison = this.compareStrategies(results);
    const metrics = results.map(result => this.calculateMetrics(result));
    
    let report = '# 📊 Trading Strategy Performance Report\n\n';
    
    // Summary
    report += '## 🎯 Executive Summary\n\n';
    report += `- **Best Performer**: ${comparison.bestPerformer}\n`;
    report += `- **Most Consistent**: ${comparison.mostConsistent}\n`;
    report += `- **Lowest Risk**: ${comparison.lowestRisk}\n`;
    report += `- **Best Risk-Adjusted Returns**: ${comparison.highestSharpe}\n\n`;

    // Detailed metrics
    report += '## 📈 Detailed Performance Metrics\n\n';
    report += '| Strategy | Return | Sharpe | Win Rate | Max DD | Trades/Month |\n';
    report += '|----------|---------|---------|----------|---------|--------------|\n';
    
    metrics.forEach(metric => {
      report += `| ${metric.strategy} | ${metric.totalReturn.toFixed(2)}% | ${metric.sharpeRatio.toFixed(2)} | ${metric.winRate.toFixed(1)}% | ${metric.maxDrawdown.toFixed(1)}% | ${metric.tradesPerMonth.toFixed(1)} |\n`;
    });

    // Recommendations
    report += '\n## 💡 Recommendations\n\n';
    comparison.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });

    return report;
  }
}
