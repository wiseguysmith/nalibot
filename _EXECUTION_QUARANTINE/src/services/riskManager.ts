export interface RiskProfile {
  conservative: {
    maxPositionSize: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDailyLoss: number;
    maxDrawdown: number;
  };
  moderate: {
    maxPositionSize: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDailyLoss: number;
    maxDrawdown: number;
  };
  aggressive: {
    maxPositionSize: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDailyLoss: number;
    maxDrawdown: number;
  };
}

export interface MarketCondition {
  volatility: 'low' | 'medium' | 'high';
  trend: 'bullish' | 'bearish' | 'sideways';
  volume: 'low' | 'medium' | 'high';
  sentiment: 'fear' | 'neutral' | 'greed';
}

export class RiskManager {
  private currentProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
  private marketCondition: MarketCondition;
  private dailyStats: {
    totalTrades: number;
    profit: number;
    loss: number;
    winRate: number;
    maxDrawdown: number;
  };

  private riskProfiles: RiskProfile = {
    conservative: {
      maxPositionSize: 10, // 10% of portfolio
      stopLossPercent: 2,
      takeProfitPercent: 4,
      maxDailyLoss: 15,
      maxDrawdown: 20
    },
    moderate: {
      maxPositionSize: 20, // 20% of portfolio
      stopLossPercent: 3,
      takeProfitPercent: 6,
      maxDailyLoss: 25,
      maxDrawdown: 30
    },
    aggressive: {
      maxPositionSize: 30, // 30% of portfolio
      stopLossPercent: 4,
      takeProfitPercent: 8,
      maxDailyLoss: 35,
      maxDrawdown: 40
    }
  };

  constructor() {
    this.marketCondition = {
      volatility: 'medium',
      trend: 'sideways',
      volume: 'medium',
      sentiment: 'neutral'
    };
    this.dailyStats = {
      totalTrades: 0,
      profit: 0,
      loss: 0,
      winRate: 0,
      maxDrawdown: 0
    };
  }

  async initialize(config: any): Promise<void> {
    // Initialize risk manager with configuration
    console.log('Risk manager initialized with config:', config);
  }

  async checkTradeRisk(signal: any, pair: string): Promise<{ allowed: boolean; reason?: string }> {
    // Basic risk check - in production this would be more sophisticated
    if (this.dailyStats.loss >= this.riskProfiles[this.currentProfile].maxDailyLoss) {
      return { allowed: false, reason: 'Daily loss limit reached' };
    }
    
    // Optional: Check quant signal for extreme conditions
    try {
      const { checkQuantTradeBlock } = await import('./quant/quantIntegration');
      const direction = signal === 'buy' || signal === 'BUY' ? 'buy' : 'sell';
      const blockReason = await checkQuantTradeBlock(pair, direction);
      
      if (blockReason === 'BLOCK_LONG' && direction === 'buy') {
        return { allowed: false, reason: 'Quant signal blocks long position (extreme bearish)' };
      }
      
      if (blockReason === 'BLOCK_SHORT' && direction === 'sell') {
        return { allowed: false, reason: 'Quant signal blocks short position (extreme bullish)' };
      }
    } catch (error) {
      // If quant check fails, continue with normal risk checks
      console.warn('[QUANT] Risk manager quant check failed, continuing:', error);
    }
    
    return { allowed: true };
  }

  // Autonomous risk adjustment based on market conditions
  adjustRiskProfile(marketData: any): void {
    const volatility = this.calculateVolatility(marketData);
    const trend = this.analyzeTrend(marketData);
    const volume = this.analyzeVolume(marketData);
    const sentiment = this.analyzeSentiment(marketData);

    this.marketCondition = { volatility, trend, volume, sentiment };

    // Autonomous decision making
    if (volatility === 'high' && trend === 'bearish') {
      this.currentProfile = 'conservative';
    } else if (volatility === 'low' && trend === 'bullish' && sentiment === 'greed') {
      this.currentProfile = 'aggressive';
    } else {
      this.currentProfile = 'moderate';
    }

    console.log(`🤖 Risk Manager: Switched to ${this.currentProfile} profile`);
    console.log(`   Market: ${trend} trend, ${volatility} volatility, ${sentiment} sentiment`);
  }

  // Dynamic position sizing based on volatility
  calculatePositionSize(portfolioValue: number, volatility: number): number {
    const baseSize = this.riskProfiles[this.currentProfile].maxPositionSize;
    const volatilityAdjustment = Math.max(0.5, Math.min(1.5, 1 - (volatility - 0.5)));
    
    return Math.round(portfolioValue * (baseSize / 100) * volatilityAdjustment);
  }

  // Adaptive stop loss based on market conditions
  calculateStopLoss(currentPrice: number, volatility: number): number {
    const baseStopLoss = this.riskProfiles[this.currentProfile].stopLossPercent;
    const volatilityAdjustment = Math.max(1.5, Math.min(3, volatility * 2));
    
    return currentPrice * (1 - (baseStopLoss * volatilityAdjustment) / 100);
  }

  // Smart take profit based on trend strength
  calculateTakeProfit(currentPrice: number, trendStrength: number): number {
    const baseTakeProfit = this.riskProfiles[this.currentProfile].takeProfitPercent;
    const trendAdjustment = Math.max(0.8, Math.min(1.5, trendStrength));
    
    return currentPrice * (1 + (baseTakeProfit * trendAdjustment) / 100);
  }

  // Should we continue trading?
  shouldContinueTrading(): boolean {
    const dailyLoss = this.dailyStats.loss;
    const maxDailyLoss = this.riskProfiles[this.currentProfile].maxDailyLoss;
    
    if (dailyLoss >= maxDailyLoss) {
      console.log(`🚨 Risk Manager: Daily loss limit reached (${dailyLoss}/${maxDailyLoss})`);
      return false;
    }
    
    return true;
  }

  // Update trading statistics
  updateStats(trade: { profit: number; loss: number }): void {
    this.dailyStats.totalTrades++;
    this.dailyStats.profit += trade.profit || 0;
    this.dailyStats.loss += trade.loss || 0;
    this.dailyStats.winRate = (this.dailyStats.profit / this.dailyStats.totalTrades) * 100;
  }

  // Get current risk parameters
  getCurrentRiskParams(): any {
    return {
      profile: this.currentProfile,
      marketCondition: this.marketCondition,
      params: this.riskProfiles[this.currentProfile],
      dailyStats: this.dailyStats
    };
  }

  // Manual override for human intervention
  setRiskProfile(profile: 'conservative' | 'moderate' | 'aggressive'): void {
    this.currentProfile = profile;
    console.log(`👤 Human Override: Risk profile set to ${profile}`);
  }

  private calculateVolatility(marketData: any): 'low' | 'medium' | 'high' {
    // Implement volatility calculation
    return 'medium';
  }

  private analyzeTrend(marketData: any): 'bullish' | 'bearish' | 'sideways' {
    // Implement trend analysis
    return 'sideways';
  }

  private analyzeVolume(marketData: any): 'low' | 'medium' | 'high' {
    // Implement volume analysis
    return 'medium';
  }

  private analyzeSentiment(marketData: any): 'fear' | 'neutral' | 'greed' {
    // Implement sentiment analysis
    return 'neutral';
  }
} 