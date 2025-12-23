import { marketDataService } from './marketDataService';

export interface BacktestConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  slippage: number; // 0.1% = 0.001
  latency: number; // milliseconds
  commission: number; // 0.1% = 0.001
  riskPerTrade: number; // 2% = 0.02
  maxDailyLoss: number; // 5% = 0.05
  maxDrawdown: number; // 10% = 0.10
  enableMarketRegimeDetection: boolean;
  enableDynamicPositionSizing: boolean;
  enableTrailingStop: boolean;
}

export interface StrategyConfig {
  name: string;
  type: 'mean-reversion' | 'trend-following' | 'arbitrage' | 'grid' | 'momentum' | 'defensive' | 'scalping' | 'seasonal' | 'breakout' | 'funding-arbitrage';
  parameters: {
    [key: string]: number | string | boolean;
  };
  riskParams: {
    stopLoss: number;
    takeProfit: number;
    maxPositionSize: number;
    minVolatility: number;
    maxVolatility: number;
  };
}

export interface MarketRegime {
  type: 'trending' | 'ranging' | 'volatile' | 'unknown';
  adx: number;
  atr: number;
  bbWidth: number;
  volatility: number;
  confidence: number;
}

export interface Trade {
  id: string;
  timestamp: Date;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  strategy: string;
  reason: string;
  stopLoss: number;
  takeProfit: number;
  marketRegime: MarketRegime;
  executionPrice: number;
  slippage: number;
  commission: number;
  pnl?: number;
  exitReason?: string;
  exitTimestamp?: Date;
}

export interface BacktestResult {
  config: BacktestConfig;
  strategy: StrategyConfig;
  trades: Trade[];
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    profitFactor: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    avgTradeReturn: number;
    exposure: number;
    avgHoldingTime: number;
    bestTrade: number;
    worstTrade: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    valueAtRisk: number;
    expectedShortfall: number;
  };
  riskMetrics: {
    dailyReturns: number[];
    volatility: number;
    downsideDeviation: number;
    calmarRatio: number;
    informationRatio: number;
    treynorRatio: number;
    beta: number;
    alpha: number;
  };
  marketRegimeStats: {
    trendingDays: number;
    rangingDays: number;
    volatileDays: number;
    regimePerformance: {
      trending: number;
      ranging: number;
      volatile: number;
    };
  };
  executionAnalysis: {
    totalSlippage: number;
    totalCommission: number;
    avgExecutionDelay: number;
    executionImpact: number; // Difference between clean and real execution
  };
}

export class AdvancedBacktestingEngine {
  private data: any[] = [];
  private currentCapital: number;
  private currentPosition: number = 0;
  private trades: Trade[] = [];
  private dailyPnL: number = 0;
  private maxCapital: number;
  private dailyReturns: number[] = [];
  private marketRegimes: MarketRegime[] = [];

  constructor() {
    console.log('🧠 Advanced Backtesting Engine initialized');
  }

  /**
   * Run comprehensive backtest with risk control
   */
  async runBacktest(config: BacktestConfig, strategy: StrategyConfig): Promise<BacktestResult> {
    console.log(`🚀 Starting advanced backtest for ${strategy.name}`);
    
    // Initialize
    this.currentCapital = config.initialCapital;
    this.maxCapital = config.initialCapital;
    this.trades = [];
    this.dailyPnL = 0;
    this.dailyReturns = [];
    this.marketRegimes = [];

    // Load historical data
    this.data = await this.loadHistoricalData(config);
    if (this.data.length === 0) {
      throw new Error('No historical data available');
    }

    console.log(`📊 Loaded ${this.data.length} data points`);

    // Run backtest
    for (let i = 20; i < this.data.length; i++) { // Start after enough data for indicators
      const candle = this.data[i];
      const previousCandles = this.data.slice(Math.max(0, i - 20), i);
      
      // Detect market regime
      const marketRegime = config.enableMarketRegimeDetection ? 
        this.detectMarketRegime(previousCandles) : 
        { type: 'unknown' as const, adx: 0, atr: 0, bbWidth: 0, volatility: 0, confidence: 0 };
      
      this.marketRegimes.push(marketRegime);

      // Check risk limits
      if (this.shouldStopTrading(config)) {
        console.log(`🛑 Trading stopped due to risk limits at ${candle.timestamp}`);
        break;
      }

      // Generate signals
      const signal = this.generateSignal(strategy, previousCandles, marketRegime);
      
      if (signal) {
        // Calculate position size with risk control
        const positionSize = this.calculatePositionSize(config, strategy, candle, marketRegime);
        
        if (positionSize > 0) {
          // Execute trade with slippage and latency simulation
          const trade = this.executeTrade(config, strategy, signal, candle, positionSize, marketRegime);
          this.trades.push(trade);
        }
      }

      // Update existing positions
      this.updatePositions(config, strategy, candle, marketRegime);
      
      // Calculate daily returns
      if (i % 24 === 0) { // Assuming 1-hour candles, daily calculation
        this.calculateDailyReturn();
      }
    }

    // Close any remaining positions
    this.closeAllPositions(config, this.data[this.data.length - 1]);

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics();
    const riskMetrics = this.calculateRiskMetrics();
    const marketRegimeStats = this.calculateMarketRegimeStats();
    const executionAnalysis = this.calculateExecutionAnalysis();

    const result: BacktestResult = {
      config,
      strategy,
      trades: this.trades,
      performance,
      riskMetrics,
      marketRegimeStats,
      executionAnalysis
    };

    console.log(`✅ Backtest completed: ${performance.totalReturn.toFixed(2)}% return, ${performance.sharpeRatio.toFixed(2)} Sharpe`);
    
    return result;
  }

  /**
   * Load historical data with quality checks
   */
  private async loadHistoricalData(config: BacktestConfig): Promise<any[]> {
    try {
      const data = await marketDataService.getHistoricalData(
        config.symbol,
        config.startDate,
        config.endDate,
        '1h',
        'kraken'
      );

      // Validate data quality
      const validData = data.filter(candle => 
        candle.open && candle.high && candle.low && candle.close && candle.volume &&
        candle.high >= candle.low &&
        candle.high >= candle.open && candle.high >= candle.close &&
        candle.low <= candle.open && candle.low <= candle.close
      );

      console.log(`📊 Data quality: ${validData.length}/${data.length} valid candles`);
      return validData;
    } catch (error) {
      console.error('❌ Failed to load historical data:', error);
      return [];
    }
  }

  /**
   * Detect market regime using technical indicators
   */
  private detectMarketRegime(candles: any[]): MarketRegime {
    if (candles.length < 14) {
      return { type: 'unknown', adx: 0, atr: 0, bbWidth: 0, volatility: 0, confidence: 0 };
    }

    // Calculate ADX (Average Directional Index)
    const adx = this.calculateADX(candles, 14);
    
    // Calculate ATR (Average True Range)
    const atr = this.calculateATR(candles, 14);
    
    // Calculate Bollinger Band Width
    const bbWidth = this.calculateBBWidth(candles, 20, 2);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(candles, 20);

    // Determine regime
    let type: 'trending' | 'ranging' | 'volatile' | 'unknown' = 'unknown';
    let confidence = 0;

    if (adx > 25 && volatility < 0.05) {
      type = 'trending';
      confidence = Math.min(adx / 50, 1);
    } else if (adx < 20 && volatility < 0.03) {
      type = 'ranging';
      confidence = Math.max(0, (20 - adx) / 20);
    } else if (volatility > 0.08) {
      type = 'volatile';
      confidence = Math.min(volatility / 0.15, 1);
    }

    return { type, adx, atr, bbWidth, volatility, confidence };
  }

  /**
   * Generate trading signal based on strategy
   */
  private generateSignal(strategy: StrategyConfig, candles: any[], marketRegime: MarketRegime): any {
    if (candles.length < 20) return null;

    const currentPrice = candles[candles.length - 1].close;
    
    switch (strategy.type) {
      case 'mean-reversion':
        return this.generateMeanReversionSignal(candles, strategy, marketRegime);
      
      case 'trend-following':
        return this.generateTrendFollowingSignal(candles, strategy, marketRegime);
      
      case 'arbitrage':
        return this.generateArbitrageSignal(candles, strategy, marketRegime);
      
      case 'grid':
        return this.generateGridSignal(candles, strategy, marketRegime);
      
      case 'momentum':
        return this.generateMomentumSignal(candles, strategy, marketRegime);
      
      case 'breakout':
        return this.generateBreakoutSignal(candles, strategy, marketRegime);
      
      case 'funding-arbitrage':
        return this.generateFundingArbitrageSignal(candles, strategy, marketRegime);
      
      default:
        return null;
    }
  }

  /**
   * Calculate position size with risk control
   */
  private calculatePositionSize(config: BacktestConfig, strategy: StrategyConfig, candle: any, marketRegime: MarketRegime): number {
    // Base position size from risk per trade
    const baseSize = this.currentCapital * config.riskPerTrade;
    
    // Adjust for volatility
    let volatilityAdjustment = 1;
    if (config.enableDynamicPositionSizing) {
      const volatility = marketRegime.volatility;
      if (volatility > strategy.riskParams.maxVolatility) {
        volatilityAdjustment = strategy.riskParams.maxVolatility / volatility;
      } else if (volatility < strategy.riskParams.minVolatility) {
        volatilityAdjustment = volatility / strategy.riskParams.minVolatility;
      }
    }

    // Adjust for market regime
    let regimeAdjustment = 1;
    if (marketRegime.type === 'volatile') {
      regimeAdjustment = 0.5; // Reduce position size in volatile markets
    } else if (marketRegime.type === 'trending' && strategy.type === 'trend-following') {
      regimeAdjustment = 1.2; // Increase position size for trend strategies in trending markets
    }

    const positionSize = baseSize * volatilityAdjustment * regimeAdjustment;
    
    // Ensure position size doesn't exceed max allocation
    const maxSize = this.currentCapital * strategy.riskParams.maxPositionSize;
    
    return Math.min(positionSize, maxSize);
  }

  /**
   * Execute trade with slippage and latency simulation
   */
  private executeTrade(config: BacktestConfig, strategy: StrategyConfig, signal: any, candle: any, positionSize: number, marketRegime: MarketRegime): Trade {
    const quantity = positionSize / candle.close;
    
    // Simulate slippage
    const slippageMultiplier = signal.type === 'BUY' ? 1 + config.slippage : 1 - config.slippage;
    const executionPrice = candle.close * slippageMultiplier;
    
    // Simulate latency impact
    const latencyImpact = this.simulateLatencyImpact(config.latency, candle);
    const finalPrice = executionPrice * (1 + latencyImpact);
    
    // Calculate commission
    const commission = positionSize * config.commission;
    
    const trade: Trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(candle.timestamp),
      symbol: config.symbol,
      type: signal.type,
      price: candle.close,
      quantity,
      strategy: strategy.name,
      reason: signal.reason,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      marketRegime,
      executionPrice: finalPrice,
      slippage: Math.abs(executionPrice - candle.close),
      commission
    };

    // Update capital
    this.currentCapital -= commission;
    this.currentPosition += signal.type === 'BUY' ? quantity : -quantity;

    return trade;
  }

  /**
   * Check if trading should stop due to risk limits
   */
  private shouldStopTrading(config: BacktestConfig): boolean {
    // Daily loss limit
    if (this.dailyPnL < -(this.maxCapital * config.maxDailyLoss)) {
      return true;
    }

    // Max drawdown limit
    const currentDrawdown = (this.maxCapital - this.currentCapital) / this.maxCapital;
    if (currentDrawdown > config.maxDrawdown) {
      return true;
    }

    return false;
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private calculatePerformanceMetrics() {
    const totalReturn = (this.currentCapital - this.maxCapital) / this.maxCapital;
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => t.pnl && t.pnl > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    const returns = this.dailyReturns;
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const volatility = this.calculateVolatilityFromReturns(returns);
    
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const profitFactor = this.calculateProfitFactor();
    const maxDrawdown = this.calculateMaxDrawdown();
    
    const tradeReturns = this.trades.filter(t => t.pnl).map(t => t.pnl!);
    const avgTradeReturn = tradeReturns.length > 0 ? tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length : 0;
    
    return {
      totalReturn,
      sharpeRatio,
      sortinoRatio,
      profitFactor,
      maxDrawdown,
      winRate,
      totalTrades,
      avgTradeReturn,
      exposure: this.calculateExposure(),
      avgHoldingTime: this.calculateAvgHoldingTime(),
      bestTrade: tradeReturns.length > 0 ? Math.max(...tradeReturns) : 0,
      worstTrade: tradeReturns.length > 0 ? Math.min(...tradeReturns) : 0,
      consecutiveWins: this.calculateConsecutiveWins(),
      consecutiveLosses: this.calculateConsecutiveLosses(),
      valueAtRisk: this.calculateVaR(returns),
      expectedShortfall: this.calculateExpectedShortfall(returns)
    };
  }

  // Helper methods for calculations
  private calculateADX(candles: any[], period: number): number {
    // Simplified ADX calculation
    return Math.random() * 50; // Placeholder
  }

  private calculateATR(candles: any[], period: number): number {
    // Simplified ATR calculation
    return Math.random() * 0.05; // Placeholder
  }

  private calculateBBWidth(candles: any[], period: number, stdDev: number): number {
    // Simplified BB width calculation
    return Math.random() * 0.1; // Placeholder
  }

  private calculateVolatility(candles: any[], period: number): number {
    // Simplified volatility calculation
    return Math.random() * 0.1; // Placeholder
  }

  private generateMeanReversionSignal(candles: any[], strategy: StrategyConfig, marketRegime: MarketRegime): any {
    // Implement mean reversion logic
    return null; // Placeholder
  }

  private generateTrendFollowingSignal(candles: any[], strategy: StrategyConfig, marketRegime: MarketRegime): any {
    // Implement trend following logic
    return null; // Placeholder
  }

  private generateArbitrageSignal(candles: any[], strategy: StrategyConfig, marketRegime: MarketRegime): any {
    // Implement arbitrage logic
    return null; // Placeholder
  }

  private generateGridSignal(candles: any[], strategy: StrategyConfig, marketRegime: MarketRegime): any {
    // Implement grid trading logic
    return null; // Placeholder
  }

  private generateMomentumSignal(candles: any[], strategy: StrategyConfig, marketRegime: MarketRegime): any {
    // Implement momentum logic
    return null; // Placeholder
  }

  private generateBreakoutSignal(candles: any[], strategy: StrategyConfig, marketRegime: MarketRegime): any {
    // Implement breakout logic
    return null; // Placeholder
  }

  private generateFundingArbitrageSignal(candles: any[], strategy: StrategyConfig, marketRegime: MarketRegime): any {
    // Implement funding arbitrage logic
    return null; // Placeholder
  }

  private simulateLatencyImpact(latency: number, candle: any): number {
    // Simulate price movement during latency
    return (Math.random() - 0.5) * 0.001 * (latency / 1000);
  }

  private updatePositions(config: BacktestConfig, strategy: StrategyConfig, candle: any, marketRegime: MarketRegime): void {
    // Update existing positions with trailing stops, etc.
  }

  private closeAllPositions(config: BacktestConfig, candle: any): void {
    // Close any remaining positions
  }

  private calculateDailyReturn(): void {
    // Calculate daily return
  }

  private calculateRiskMetrics() {
    return {
      dailyReturns: this.dailyReturns,
      volatility: 0,
      downsideDeviation: 0,
      calmarRatio: 0,
      informationRatio: 0,
      treynorRatio: 0,
      beta: 0,
      alpha: 0
    };
  }

  private calculateMarketRegimeStats() {
    return {
      trendingDays: 0,
      rangingDays: 0,
      volatileDays: 0,
      regimePerformance: {
        trending: 0,
        ranging: 0,
        volatile: 0
      }
    };
  }

  private calculateExecutionAnalysis() {
    return {
      totalSlippage: 0,
      totalCommission: 0,
      avgExecutionDelay: 0,
      executionImpact: 0
    };
  }

  private calculateVolatilityFromReturns(returns: number[]): number {
    return 0; // Placeholder
  }

  private calculateSortinoRatio(returns: number[]): number {
    return 0; // Placeholder
  }

  private calculateProfitFactor(): number {
    return 0; // Placeholder
  }

  private calculateMaxDrawdown(): number {
    return 0; // Placeholder
  }

  private calculateExposure(): number {
    return 0; // Placeholder
  }

  private calculateAvgHoldingTime(): number {
    return 0; // Placeholder
  }

  private calculateConsecutiveWins(): number {
    return 0; // Placeholder
  }

  private calculateConsecutiveLosses(): number {
    return 0; // Placeholder
  }

  private calculateVaR(returns: number[]): number {
    return 0; // Placeholder
  }

  private calculateExpectedShortfall(returns: number[]): number {
    return 0; // Placeholder
  }
}

export const advancedBacktestingEngine = new AdvancedBacktestingEngine(); 