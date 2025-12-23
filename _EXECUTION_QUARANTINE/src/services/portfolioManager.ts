export interface Asset {
  symbol: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  allocation: number; // percentage of portfolio
  performance: number; // percentage gain/loss
  lastUpdated: Date;
}

export interface PortfolioConfig {
  maxAssets: number;
  rebalanceThreshold: number; // percentage deviation to trigger rebalancing
  diversificationRules: {
    maxSingleAsset: number; // max percentage in single asset
    minAssets: number;
    targetAllocation: { [symbol: string]: number };
  };
}

export class PortfolioManager {
  private assets: Map<string, Asset> = new Map();
  private config: PortfolioConfig;
  private totalValue: number = 0;
  private performanceHistory: Array<{
    date: Date;
    totalValue: number;
    dailyReturn: number;
  }> = [];

  constructor(initialCapital: number = 100) {
    this.totalValue = initialCapital;
    this.config = {
      maxAssets: 5,
      rebalanceThreshold: 5, // 5% deviation triggers rebalancing
      diversificationRules: {
        maxSingleAsset: 30, // max 30% in single asset
        minAssets: 2,
        targetAllocation: {
          'BTC/USD': 40,
          'ETH/USD': 30,
          'XRP/USD': 15,
          'SOL/USD': 10,
          'ADA/USD': 5
        }
      }
    };
  }

  async initialize(): Promise<void> {
    // Initialize portfolio manager
    console.log('Portfolio manager initialized');
  }

  // Autonomous portfolio rebalancing
  async rebalancePortfolio(marketData: any): Promise<{
    actions: Array<{ action: 'buy' | 'sell'; symbol: string; amount: number; reason: string }>;
    rebalanced: boolean;
  }> {
    const actions: Array<{ action: 'buy' | 'sell'; symbol: string; amount: number; reason: string }> = [];
    let rebalanced = false;

    // Check if rebalancing is needed
    const deviations = this.calculateAllocationDeviations();
    const needsRebalancing = Object.values(deviations).some(dev => Math.abs(dev) > this.config.rebalanceThreshold);

    if (needsRebalancing) {
      console.log('🤖 Portfolio Manager: Rebalancing portfolio...');
      
      // Calculate optimal allocations
      const optimalAllocations = this.calculateOptimalAllocations(marketData);
      
      // Generate rebalancing actions
      for (const [symbol, currentAllocation] of Object.entries(this.getCurrentAllocations())) {
        const targetAllocation = optimalAllocations[symbol] || 0;
        const deviation = targetAllocation - currentAllocation;
        
        if (Math.abs(deviation) > this.config.rebalanceThreshold) {
          const action = deviation > 0 ? 'buy' : 'sell';
          const amount = Math.abs(deviation) * this.totalValue / 100;
          
          actions.push({
            action,
            symbol,
            amount,
            reason: `Rebalancing: ${deviation > 0 ? 'Underweight' : 'Overweight'} ${symbol}`
          });
        }
      }
      
      rebalanced = true;
    }

    return { actions, rebalanced };
  }

  // Smart asset selection based on market conditions
  selectOptimalAssets(marketData: any): string[] {
    const opportunities = this.analyzeMarketOpportunities(marketData);
    const selectedAssets: string[] = [];
    
    // Sort opportunities by potential return
    const sortedOpportunities = opportunities.sort((a, b) => b.score - a.score);
    
    // Select top assets within diversification rules
    for (const opportunity of sortedOpportunities) {
      if (selectedAssets.length >= this.config.maxAssets) break;
      
      const currentAllocation = this.getCurrentAllocation(opportunity.symbol);
      if (currentAllocation < this.config.diversificationRules.maxSingleAsset) {
        selectedAssets.push(opportunity.symbol);
      }
    }
    
    return selectedAssets;
  }

  // Dynamic position sizing based on volatility and correlation
  calculatePositionSize(symbol: string, marketData: any): number {
    const volatility = this.calculateVolatility(symbol, marketData);
    const correlation = this.calculateCorrelation(symbol, marketData);
    const baseAllocation = this.config.diversificationRules.targetAllocation[symbol] || 10;
    
    // Adjust for volatility (higher volatility = smaller position)
    const volatilityAdjustment = Math.max(0.5, Math.min(1.5, 1 - (volatility - 0.5)));
    
    // Adjust for correlation (higher correlation = smaller position)
    const correlationAdjustment = Math.max(0.7, Math.min(1.3, 1 - correlation * 0.3));
    
    return baseAllocation * volatilityAdjustment * correlationAdjustment;
  }

  // Risk-adjusted performance tracking
  updatePerformance(): void {
    const currentValue = this.calculateTotalValue();
    const dailyReturn = ((currentValue - this.totalValue) / this.totalValue) * 100;
    
    this.performanceHistory.push({
      date: new Date(),
      totalValue: currentValue,
      dailyReturn
    });
    
    this.totalValue = currentValue;
    
    // Keep only last 30 days of history
    if (this.performanceHistory.length > 30) {
      this.performanceHistory.shift();
    }
  }

  // Get portfolio analytics
  getPortfolioAnalytics(): any {
    const currentValue = this.calculateTotalValue();
    const totalReturn = ((currentValue - 100) / 100) * 100; // Assuming $100 initial
    
    const dailyReturns = this.performanceHistory.map(h => h.dailyReturn);
    const volatility = this.calculatePortfolioVolatility(dailyReturns);
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns);
    const maxDrawdown = this.calculateMaxDrawdown();
    
    return {
      totalValue: currentValue,
      totalReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      assetCount: this.assets.size,
      topPerformers: this.getTopPerformers(),
      riskMetrics: this.getRiskMetrics()
    };
  }

  // Add or update asset
  updateAsset(symbol: string, amount: number, price: number): void {
    const existingAsset = this.assets.get(symbol);
    
    if (existingAsset) {
      // Update existing position
      const newAmount = existingAsset.amount + amount;
      const avgPrice = (existingAsset.amount * existingAsset.entryPrice + amount * price) / newAmount;
      
      this.assets.set(symbol, {
        ...existingAsset,
        amount: newAmount,
        entryPrice: avgPrice,
        currentPrice: price,
        performance: ((price - avgPrice) / avgPrice) * 100,
        lastUpdated: new Date()
      });
    } else {
      // Add new position
      this.assets.set(symbol, {
        symbol,
        amount,
        entryPrice: price,
        currentPrice: price,
        allocation: (amount * price / this.totalValue) * 100,
        performance: 0,
        lastUpdated: new Date()
      });
    }
    
    this.updateAllocations();
  }

  // Human override for manual portfolio adjustments
  manualAdjustment(symbol: string, action: 'buy' | 'sell', amount: number, reason: string): void {
    console.log(`👤 Human Override: ${action.toUpperCase()} ${amount} ${symbol} - ${reason}`);
    
    if (action === 'sell') {
      amount = -amount;
    }
    
    this.updateAsset(symbol, amount, this.getCurrentPrice(symbol));
  }

  // Get current portfolio state
  getPortfolioState(): any {
    return {
      assets: Array.from(this.assets.values()),
      totalValue: this.calculateTotalValue(),
      allocations: this.getCurrentAllocations(),
      performance: this.getPortfolioAnalytics()
    };
  }

  private calculateTotalValue(): number {
    let total = 0;
    for (const asset of this.assets.values()) {
      total += asset.amount * asset.currentPrice;
    }
    return total;
  }

  private updateAllocations(): void {
    const totalValue = this.calculateTotalValue();
    
    for (const asset of this.assets.values()) {
      asset.allocation = (asset.amount * asset.currentPrice / totalValue) * 100;
    }
  }

  private getCurrentAllocations(): { [symbol: string]: number } {
    const allocations: { [symbol: string]: number } = {};
    for (const asset of this.assets.values()) {
      allocations[asset.symbol] = asset.allocation;
    }
    return allocations;
  }

  private getCurrentAllocation(symbol: string): number {
    return this.assets.get(symbol)?.allocation || 0;
  }

  private getCurrentPrice(symbol: string): number {
    return this.assets.get(symbol)?.currentPrice || 0;
  }

  private calculateAllocationDeviations(): { [symbol: string]: number } {
    const current = this.getCurrentAllocations();
    const target = this.config.diversificationRules.targetAllocation;
    const deviations: { [symbol: string]: number } = {};
    
    for (const symbol of Object.keys(target)) {
      deviations[symbol] = (current[symbol] || 0) - target[symbol];
    }
    
    return deviations;
  }

  private calculateOptimalAllocations(marketData: any): { [symbol: string]: number } {
    // Implement smart allocation based on market conditions
    return this.config.diversificationRules.targetAllocation;
  }

  private analyzeMarketOpportunities(marketData: any): Array<{ symbol: string; score: number }> {
    // Implement market opportunity analysis
    return [
      { symbol: 'BTC/USD', score: 0.8 },
      { symbol: 'ETH/USD', score: 0.7 },
      { symbol: 'XRP/USD', score: 0.6 },
      { symbol: 'SOL/USD', score: 0.5 },
      { symbol: 'ADA/USD', score: 0.4 }
    ];
  }

  private calculateVolatility(symbol: string, marketData: any): number {
    // Implement volatility calculation
    return 0.5;
  }

  private calculateCorrelation(symbol: string, marketData: any): number {
    // Implement correlation calculation
    return 0.3;
  }

  private calculatePortfolioVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = this.calculatePortfolioVolatility(returns);
    return volatility > 0 ? mean / volatility : 0;
  }

  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    let peak = this.performanceHistory[0]?.totalValue || 0;
    
    for (const record of this.performanceHistory) {
      if (record.totalValue > peak) {
        peak = record.totalValue;
      }
      const drawdown = (peak - record.totalValue) / peak * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  private getTopPerformers(): Array<{ symbol: string; performance: number }> {
    return Array.from(this.assets.values())
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3)
      .map(asset => ({ symbol: asset.symbol, performance: asset.performance }));
  }

  private getRiskMetrics(): any {
    return {
      diversificationScore: this.calculateDiversificationScore(),
      concentrationRisk: this.calculateConcentrationRisk(),
      correlationRisk: this.calculateCorrelationRisk()
    };
  }

  private calculateDiversificationScore(): number {
    const allocations = Object.values(this.getCurrentAllocations());
    const herfindahlIndex = allocations.reduce((sum, alloc) => sum + Math.pow(alloc / 100, 2), 0);
    return Math.max(0, 1 - herfindahlIndex);
  }

  private calculateConcentrationRisk(): number {
    const allocations = Object.values(this.getCurrentAllocations());
    return Math.max(...allocations) / 100;
  }

  private calculateCorrelationRisk(): number {
    // Implement correlation risk calculation
    return 0.3;
  }
} 