import { Strategy, TradeSignal, TradeResult } from '../types/trading';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateEMA, calculateATR } from '../utils/indicators';
import { MeanReversionStrategy, TrendFollowingStrategy, ArbitrageStrategy, GridTradingStrategy, VolatilityBreakoutStrategy } from '../utils/strategies';

export interface BacktestResult {
  strategy: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  trades: TradeResult[];
  equity: number[];
  dates: string[];
}

export interface HistoricalData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class BacktestingEngine {
  private strategies: Map<string, Strategy>;
  private historicalData: HistoricalData[] = [];
  private initialCapital: number = 10000; // $10,000 starting capital

  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    this.strategies.set('MeanReversion', new MeanReversionStrategy());
    this.strategies.set('TrendFollowing', new TrendFollowingStrategy());
    this.strategies.set('Arbitrage', new ArbitrageStrategy());
    this.strategies.set('GridTrading', new GridTradingStrategy());
    this.strategies.set('VolatilityBreakout', new VolatilityBreakoutStrategy());
  }

  /**
   * Load historical data from a data source
   */
  async loadHistoricalData(symbol: string, timeframe: string, days: number = 180): Promise<void> {
    try {
      // For now, we'll generate synthetic data for testing
      // In production, this would fetch from Kraken/Binance APIs
      this.historicalData = this.generateSyntheticData(days);
      console.log(`Loaded ${this.historicalData.length} data points for ${symbol}`);
    } catch (error) {
      console.error('Error loading historical data:', error);
      throw error;
    }
  }

  /**
   * Generate synthetic historical data for testing
   */
  private generateSyntheticData(days: number): HistoricalData[] {
    const data: HistoricalData[] = [];
    let price = 100; // Starting price
    const volatility = 0.02; // 2% daily volatility

    for (let i = 0; i < days * 24; i++) { // Hourly data
      const timestamp = Date.now() - (days * 24 - i) * 60 * 60 * 1000;
      
      // Random walk with mean reversion
      const change = (Math.random() - 0.5) * volatility * price;
      price = Math.max(price + change, price * 0.5); // Prevent negative prices
      
      const high = price * (1 + Math.random() * 0.01);
      const low = price * (1 - Math.random() * 0.01);
      const open = price * (1 + (Math.random() - 0.5) * 0.005);
      const close = price;
      const volume = Math.random() * 1000000 + 100000;

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }

    return data;
  }

  /**
   * Run backtest for a specific strategy
   */
  runBacktest(strategyName: string): BacktestResult {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy ${strategyName} not found`);
    }

    if (this.historicalData.length === 0) {
      throw new Error('No historical data loaded');
    }

    const trades: TradeResult[] = [];
    const equity: number[] = [this.initialCapital];
    const dates: string[] = [];
    let currentCapital = this.initialCapital;
    let position = 0;
    let entryPrice = 0;

    // Run strategy on historical data
    for (let i = 50; i < this.historicalData.length; i++) { // Start at 50 to have enough data for indicators
      const currentData = this.historicalData[i];
      const previousData = this.historicalData.slice(0, i + 1);
      
      dates.push(new Date(currentData.timestamp).toISOString().split('T')[0]);

      // Generate signal
      const signal = strategy.generateSignal(previousData, currentData);

      // Execute trades based on signals
      if (signal === TradeSignal.BUY && position === 0) {
        // Open long position
        position = 1;
        entryPrice = currentData.close;
        const shares = Math.floor(currentCapital * 0.95 / currentData.close); // Use 95% of capital
        const cost = shares * currentData.close;
        currentCapital -= cost;
        
        trades.push({
          timestamp: currentData.timestamp,
          type: 'BUY',
          price: currentData.close,
          shares,
          cost,
          strategy: strategyName
        });
      } else if (signal === TradeSignal.SELL && position === 1) {
        // Close long position
        const shares = trades[trades.length - 1].shares;
        const revenue = shares * currentData.close;
        currentCapital += revenue;
        
        trades.push({
          timestamp: currentData.timestamp,
          type: 'SELL',
          price: currentData.close,
          shares,
          revenue,
          strategy: strategyName
        });
        
        position = 0;
      }

      // Calculate current equity
      if (position === 1) {
        const currentValue = trades[trades.length - 1].shares * currentData.close;
        equity.push(currentCapital + currentValue);
      } else {
        equity.push(currentCapital);
      }
    }

    // Close any open position at the end
    if (position === 1) {
      const lastData = this.historicalData[this.historicalData.length - 1];
      const shares = trades[trades.length - 1].shares;
      const revenue = shares * lastData.close;
      currentCapital += revenue;
      
      trades.push({
        timestamp: lastData.timestamp,
        type: 'SELL',
        price: lastData.close,
        shares,
        revenue,
        strategy: strategyName
      });
      
      equity[equity.length - 1] = currentCapital;
    }

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(trades, equity);

    return {
      strategy: strategyName,
      totalTrades: performance.totalTrades,
      winningTrades: performance.winningTrades,
      losingTrades: performance.losingTrades,
      winRate: performance.winRate,
      totalReturn: performance.totalReturn,
      sharpeRatio: performance.sharpeRatio,
      maxDrawdown: performance.maxDrawdown,
      trades,
      equity,
      dates
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(trades: TradeResult[], equity: number[]): {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  } {
    const totalTrades = Math.floor(trades.length / 2); // Buy/Sell pairs
    let winningTrades = 0;
    let losingTrades = 0;
    let totalReturn = 0;

    // Calculate returns for each completed trade
    for (let i = 1; i < trades.length; i += 2) {
      if (trades[i] && trades[i - 1]) {
        const buyTrade = trades[i - 1];
        const sellTrade = trades[i];
        const return_pct = (sellTrade.price - buyTrade.price) / buyTrade.price;
        
        if (return_pct > 0) {
          winningTrades++;
        } else {
          losingTrades++;
        }
        
        totalReturn += return_pct;
      }
    }

    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const totalReturnPercent = totalReturn * 100;

    // Calculate Sharpe Ratio (simplified)
    const returns = equity.slice(1).map((value, index) => 
      (value - equity[index]) / equity[index]
    );
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;

    // Calculate Max Drawdown
    let maxDrawdown = 0;
    let peak = equity[0];
    for (const value of equity) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalReturn: totalReturnPercent,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100
    };
  }

  /**
   * Run backtest for all strategies
   */
  runAllBacktests(): Map<string, BacktestResult> {
    const results = new Map<string, BacktestResult>();
    
    for (const [strategyName] of this.strategies) {
      try {
        const result = this.runBacktest(strategyName);
        results.set(strategyName, result);
        console.log(`✅ Completed backtest for ${strategyName}`);
      } catch (error) {
        console.error(`❌ Error in ${strategyName} backtest:`, error);
      }
    }

    return results;
  }

  /**
   * Get strategy comparison summary
   */
  getStrategyComparison(results: Map<string, BacktestResult>): any[] {
    const comparison = [];
    
    for (const [strategyName, result] of results) {
      comparison.push({
        strategy: strategyName,
        totalReturn: result.totalReturn.toFixed(2) + '%',
        winRate: (result.winRate * 100).toFixed(1) + '%',
        sharpeRatio: result.sharpeRatio.toFixed(2),
        maxDrawdown: result.maxDrawdown.toFixed(2) + '%',
        totalTrades: result.totalTrades
      });
    }

    // Sort by total return
    return comparison.sort((a, b) => 
      parseFloat(b.totalReturn) - parseFloat(a.totalReturn)
    );
  }
} 