// PHASE 1: Removed KrakenWrapper import - strategies cannot access exchange adapters
import { calculateMACD, calculateRSI, calculateBollingerBands, calculateEMA } from '../utils/indicators';
import { 
  meanReversionStrategy, 
  trendFollowingStrategy, 
  calculateGridLevels,
  findCrossExchangeArbitrage,
  volatilityBreakoutStrategy,
  ExchangePriceData
} from '../utils/strategies';
import { NotificationService, NotificationType } from './notificationService';
import { PricePredictionModel } from '../utils/mlModel';
import { blendSignals, checkQuantTradeBlock } from './quant/quantIntegration';

interface StrategyConfig {
  maxInvestment: number;        // $20 maximum risk per trade (20% of $100)
  portfolioRiskPercent: number; // 20% of portfolio per trade
  maxDailyLoss: number;        // $25 maximum daily loss (25% of $100)
  minProfitPerTrade: number;   // $5 minimum profit target
  minProfitPercent: number;    // Minimum profit percentage for arbitrage
  rsiOversold: number;         // RSI threshold for oversold condition
  rsiOverbought: number;       // RSI threshold for overbought condition
  enabled: boolean;            // Trading enabled/disabled flag
  tradingMode: 'test' | 'live';
  enabledStrategies: {
    trendFollowing: boolean;
    meanReversion: boolean;
    arbitrage: boolean;
    gridTrading: boolean;
    volatilityBreakout: boolean;
  };
  dailyStats: {
    totalTrades: number;
    profit: number;
    loss: number;
    lastReset: Date;
  };
}

/**
 * Strategy Service
 * 
 * PHASE 1: Strategies are pure signal generators.
 * They cannot access exchange adapters or execute trades.
 * All execution must go through ExecutionManager.
 */
export class StrategyService {
  // PHASE 1: Removed exchange client - strategies cannot access adapters
  private notificationService: NotificationService;
  private config: StrategyConfig = {
    maxInvestment: 20,        // $20 max per trade (20% of $100)
    portfolioRiskPercent: 20, // 20% of portfolio per trade
    maxDailyLoss: 25,         // $25 max daily loss (25% of $100)
    minProfitPerTrade: 5,     // $5 minimum profit target
    minProfitPercent: 0.8,    // 0.8% minimum profit for arbitrage (more realistic)
    rsiOversold: 30,          // RSI below 30 is considered oversold
    rsiOverbought: 70,        // RSI above 70 is considered overbought
    enabled: false,           // Start with trading disabled
    tradingMode: 'test',
    enabledStrategies: {
      trendFollowing: true,
      meanReversion: true,
      arbitrage: true,
      gridTrading: false,
      volatilityBreakout: false
    },
    dailyStats: {
      totalTrades: 0,
      profit: 0,
      loss: 0,
      lastReset: new Date()
    }
  };
  private isTrading: boolean = false;
  private activeGridLevels: Map<string, {
    buyLevels: Array<{ price: number; allocation: number }>;
    sellLevels: Array<{ price: number; allocation: number }>;
  }> = new Map();
  private predictionModel: PricePredictionModel;

  /**
   * Constructor
   * 
   * PHASE 1: Strategies do NOT receive exchange clients.
   * They generate signals only. Execution goes through ExecutionManager.
   */
  constructor(notificationService?: NotificationService) {
    // PHASE 1: Removed exchange client parameter - strategies cannot access adapters
    this.notificationService = notificationService || new NotificationService();
    this.predictionModel = new PricePredictionModel();
  }

  /**
   * Check arbitrage opportunities
   * 
   * PHASE 1: Strategies receive market data as parameters.
   * They cannot fetch market data themselves.
   */
  async checkArbitrageOpportunities(marketData?: {
    pairs?: any;
    prices?: any;
  }): Promise<{
    shouldTrade: boolean;
    symbol?: string;
    profit?: number;
    route?: string[];
  }> {
    if (!this.config.enabled || !this.config.enabledStrategies.arbitrage) {
      return { shouldTrade: false };
    }
    
    // PHASE 1: Market data must be provided - strategies cannot fetch it
    if (!marketData || !marketData.pairs || !marketData.prices) {
      console.warn('[STRATEGY_SERVICE] Market data required for arbitrage check - caller must provide');
      return { shouldTrade: false };
    }
    
    try {
      const pairs = marketData.pairs;
      const prices = marketData.prices;

      // Find triangular arbitrage opportunities
      const opportunities = this.findTriangularArbitrage(prices.result);
      
      if (opportunities.length > 0) {
        const bestOpportunity = opportunities[0];
        if (bestOpportunity.profit > this.config.minProfitPercent) {
          // Notify about the arbitrage opportunity
          await this.notificationService.notifyArbitrageOpportunity(
            bestOpportunity.route,
            bestOpportunity.profit,
            0.5 // Estimated fees
          );
          
          return {
            shouldTrade: true,
            symbol: bestOpportunity.symbols[0],
            profit: bestOpportunity.profit,
            route: bestOpportunity.route
          };
        }
      }

      return { shouldTrade: false };
    } catch (error) {
      console.error('Error checking arbitrage:', error);
      return { shouldTrade: false };
    }
  }

  async checkCrossExchangeArbitrage(
    exchangeData: ExchangePriceData[],
    tradeAmount: number = 1000
  ): Promise<{
    shouldTrade: boolean;
    opportunities?: Array<{
      buyExchange: string;
      sellExchange: string;
      symbol: string;
      profitPercent: number;
      estimatedProfit: number;
    }>;
  }> {
    if (!this.config.enabled || !this.config.enabledStrategies.arbitrage) {
      return { shouldTrade: false };
    }
    
    try {
      const opportunities = findCrossExchangeArbitrage(
        exchangeData,
        this.config.minProfitPercent,
        tradeAmount
      );
      
      if (opportunities.length > 0) {
        // Notify about the best opportunity
        const bestOpp = opportunities[0];
        await this.notificationService.notifyArbitrageOpportunity(
          [`${bestOpp.symbol}: ${bestOpp.buyExchange} → ${bestOpp.sellExchange}`],
          bestOpp.profitPercent,
          bestOpp.totalFees
        );
        
        return {
          shouldTrade: true,
          opportunities: opportunities.map(opp => ({
            buyExchange: opp.buyExchange,
            sellExchange: opp.sellExchange,
            symbol: opp.symbol,
            profitPercent: opp.profitPercent,
            estimatedProfit: opp.estimatedProfit
          }))
        };
      }
      
      return { shouldTrade: false };
    } catch (error) {
      console.error('Error checking cross-exchange arbitrage:', error);
      return { shouldTrade: false };
    }
  }

  /**
   * Check trend following signals
   * 
   * PHASE 1: Strategies receive market data as parameters.
   */
  async checkTrendFollowing(symbol: string, ohlcData?: any): Promise<{
    shouldTrade: boolean;
    action?: 'buy' | 'sell';
    reason?: string;
    confidence?: number;
  }> {
    if (!this.config.enabled || !this.config.enabledStrategies.trendFollowing) {
      return { shouldTrade: false };
    }
    
    // PHASE 1: Market data must be provided
    if (!ohlcData || !ohlcData.result) {
      console.warn('[STRATEGY_SERVICE] OHLC data required for trend following - caller must provide');
      return { shouldTrade: false };
    }
    
    try {
      const ohlc = ohlcData;
      const candles = Object.values(ohlc.result)[0] as any[];
      const closes = candles.map((candle: any) => parseFloat(candle[4]));
      const volumes = candles.map((candle: any) => parseFloat(candle[5]));
      
      const result = trendFollowingStrategy(
        closes,
        volumes,
        9,  // shortEMA
        21, // longEMA
        10  // volumeEMA
      );
      
      if (result.action !== 'hold' && result.confidence >= 0.5) {
        // Check if quant signal blocks this trade
        const blockReason = await checkQuantTradeBlock(symbol, result.action);
        if (blockReason) {
          console.log(`[QUANT] Trade blocked: ${blockReason} for ${symbol}`);
          return { shouldTrade: false };
        }
        
        // Blend with quant signal
        const technicalSignal = result.action === 'buy' ? result.confidence : -result.confidence;
        const blendedSignal = await blendSignals(symbol, technicalSignal);
        
        // Convert blended signal back to action
        const finalAction = blendedSignal > 0.2 ? 'buy' : blendedSignal < -0.2 ? 'sell' : 'hold';
        
        if (finalAction === 'hold') {
          return { shouldTrade: false };
        }
        
        // Notify about the trading opportunity
        await this.notificationService.notifyTradeOpportunity(
          symbol,
          finalAction,
          `${result.signals.join(', ')}, Quant blended: ${blendedSignal.toFixed(3)}`
        );
        
        const predictedPrice = this.predictionModel.predict(closes[closes.length - 1]);
        console.log(`Predicted price for ${symbol}: $${predictedPrice.toFixed(2)}`);
        
        return {
          shouldTrade: true,
          action: finalAction,
          reason: `${result.signals.join(', ')}, Quant: ${blendedSignal.toFixed(3)}`,
          confidence: Math.abs(blendedSignal)
        };
      }
      
      return { shouldTrade: false };
    } catch (error) {
      console.error('Error checking trend following strategy:', error);
      return { shouldTrade: false };
    }
  }

  /**
   * Check mean reversion signals
   * 
   * PHASE 1: Strategies receive market data as parameters.
   */
  async checkMeanReversion(symbol: string, ohlcData?: any): Promise<{
    shouldTrade: boolean;
    action?: 'buy' | 'sell';
    reason?: string;
    confidence?: number;
  }> {
    if (!this.config.enabled || !this.config.enabledStrategies.meanReversion) {
      return { shouldTrade: false };
    }
    
    // PHASE 1: Market data must be provided
    if (!ohlcData || !ohlcData.result) {
      console.warn('[STRATEGY_SERVICE] OHLC data required for mean reversion - caller must provide');
      return { shouldTrade: false };
    }
    
    try {
      const ohlc = ohlcData;
      const candles = Object.values(ohlc.result)[0] as any[];
      const closes = candles.map((candle: any) => parseFloat(candle[4]));
      
      const result = meanReversionStrategy(
        closes,
        14, // rsiPeriod
        this.config.rsiOversold,
        this.config.rsiOverbought,
        20, // bbPeriod
        2   // bbStdDev
      );
      
      if (result.action !== 'hold' && result.confidence >= 0.5) {
        // Check if quant signal blocks this trade
        const blockReason = await checkQuantTradeBlock(symbol, result.action);
        if (blockReason) {
          console.log(`[QUANT] Trade blocked: ${blockReason} for ${symbol}`);
          return { shouldTrade: false };
        }
        
        // Blend with quant signal
        const technicalSignal = result.action === 'buy' ? result.confidence : -result.confidence;
        const blendedSignal = await blendSignals(symbol, technicalSignal);
        
        // Convert blended signal back to action
        const finalAction = blendedSignal > 0.2 ? 'buy' : blendedSignal < -0.2 ? 'sell' : 'hold';
        
        if (finalAction === 'hold') {
          return { shouldTrade: false };
        }
        
        // Notify about the trading opportunity
        await this.notificationService.notifyTradeOpportunity(
          symbol,
          finalAction,
          `${result.signals.join(', ')}, Quant blended: ${blendedSignal.toFixed(3)}`
        );
        
        return {
          shouldTrade: true,
          action: finalAction,
          reason: `${result.signals.join(', ')}, Quant: ${blendedSignal.toFixed(3)}`,
          confidence: Math.abs(blendedSignal)
        };
      }
      
      return { shouldTrade: false };
    } catch (error) {
      console.error('Error checking mean reversion strategy:', error);
      return { shouldTrade: false };
    }
  }

  /**
   * Check volatility breakout signals
   * 
   * PHASE 1: Strategies receive market data as parameters.
   */
  async checkVolatilityBreakout(symbol: string, ohlcData?: any): Promise<{
    shouldTrade: boolean;
    action?: 'buy' | 'sell';
    reason?: string;
    confidence?: number;
  }> {
    if (!this.config.enabled || !this.config.enabledStrategies.volatilityBreakout) {
      return { shouldTrade: false };
    }
    
    // PHASE 1: Market data must be provided
    if (!ohlcData || !ohlcData.result) {
      console.warn('[STRATEGY_SERVICE] OHLC data required for volatility breakout - caller must provide');
      return { shouldTrade: false };
    }
    
    try {
      const ohlc = ohlcData;
      const candles = Object.values(ohlc.result)[0] as any[];
      const closes = candles.map((candle: any) => parseFloat(candle[4]));
      const volumes = candles.map((candle: any) => parseFloat(candle[5]));
      
      const result = volatilityBreakoutStrategy(
        closes,
        volumes,
        14,  // atrPeriod
        1.5  // breakoutThreshold
      );
      
      if (result.action !== 'hold' && result.confidence >= 0.6) {
        // Notify about the trading opportunity
        await this.notificationService.notifyTradeOpportunity(
          symbol,
          result.action,
          result.signals.join(', ')
        );
        
        return {
          shouldTrade: true,
          action: result.action,
          reason: result.signals.join(', '),
          confidence: result.confidence
        };
      }
      
      return { shouldTrade: false };
    } catch (error) {
      console.error('Error checking volatility breakout strategy:', error);
      return { shouldTrade: false };
    }
  }

  /**
   * Setup grid trading levels
   * 
   * PHASE 1: Strategies receive market data as parameters.
   */
  async setupGridTrading(symbol: string, tickerData?: any, gridCount: number = 10, gridSpread: number = 2.0): Promise<boolean> {
    if (!this.config.enabled || !this.config.enabledStrategies.gridTrading) {
      return false;
    }
    
    // PHASE 1: Market data must be provided
    if (!tickerData || !tickerData.result) {
      console.warn('[STRATEGY_SERVICE] Ticker data required for grid trading - caller must provide');
      return false;
    }
    
    try {
      const ticker = tickerData;
      const tickerResult = ticker.result as Record<string, { c: string[] }>;
      const price = parseFloat(tickerResult[symbol].c[0]);
      
      // Calculate grid levels
      const gridLevels = calculateGridLevels(price, gridCount, gridSpread);
      
      // Store grid levels for this symbol
      this.activeGridLevels.set(symbol, gridLevels);
      
      // Notify about grid setup
      await this.notificationService.sendNotification(
        NotificationType.SYSTEM_ALERT,
        'Grid Trading Setup',
        `Set up ${gridCount} grid levels for ${symbol} with ${gridSpread}% spread around $${price}`,
        {
          symbol,
          currentPrice: price,
          buyLevels: gridLevels.buyLevels.length,
          sellLevels: gridLevels.sellLevels.length
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error setting up grid trading:', error);
      return false;
    }
  }

  /**
   * Check grid trading levels
   * 
   * PHASE 1: Strategies receive market data as parameters.
   */
  async checkGridLevels(symbol: string, tickerData?: any): Promise<{
    shouldTrade: boolean;
    action?: 'buy' | 'sell';
    price?: number;
    allocation?: number;
  }> {
    if (!this.config.enabled || !this.config.enabledStrategies.gridTrading) {
      return { shouldTrade: false };
    }
    
    // Check if we have grid levels for this symbol
    const gridLevels = this.activeGridLevels.get(symbol);
    if (!gridLevels) {
      return { shouldTrade: false };
    }
    
    // PHASE 1: Market data must be provided
    if (!tickerData || !tickerData.result) {
      console.warn('[STRATEGY_SERVICE] Ticker data required for grid levels - caller must provide');
      return { shouldTrade: false };
    }
    
    try {
      const ticker = tickerData;
      const tickerResult = ticker.result as Record<string, { c: string[] }>;
      const currentPrice = parseFloat(tickerResult[symbol].c[0]);
      
      // Check if price hits any of our grid levels
      let action: 'buy' | 'sell' | null = null;
      let gridPrice = 0;
      let allocation = 0;
      
      // Check buy levels
      for (const level of gridLevels.buyLevels) {
        if (currentPrice <= level.price * 1.001 && currentPrice >= level.price * 0.999) {
          action = 'buy';
          gridPrice = level.price;
          allocation = level.allocation;
          break;
        }
      }
      
      // Check sell levels
      if (!action) {
        for (const level of gridLevels.sellLevels) {
          if (currentPrice >= level.price * 0.999 && currentPrice <= level.price * 1.001) {
            action = 'sell';
            gridPrice = level.price;
            allocation = level.allocation;
            break;
          }
        }
      }
      
      if (action) {
        // Notify about grid trading opportunity
        await this.notificationService.notifyTradeOpportunity(
          symbol,
          action,
          `Grid level hit at $${gridPrice.toFixed(2)} (${allocation}% allocation)`
        );
        
        return {
          shouldTrade: true,
          action,
          price: gridPrice,
          allocation
        };
      }
      
      return { shouldTrade: false };
    } catch (error) {
      console.error('Error checking grid levels:', error);
      return { shouldTrade: false };
    }
  }

  // Method to execute a trade and send notifications
  async executeTrade(
    symbol: string, 
    action: 'buy' | 'sell', 
    amount: number, 
    price: number,
    reason?: string
  ): Promise<boolean> {
    try {
      if (this.config.tradingMode === 'test') {
        console.log(`TEST MODE: Would ${action} ${amount} ${symbol} at $${price}`);
        
        // Simulate trade execution
        const profit = action === 'sell' ? (amount * price * 0.01) : undefined;
        
        // Send notification
        await this.notificationService.notifyTradeExecution(
          symbol,
          action,
          amount,
          price,
          profit
        );
        
        // Update stats
        if (profit) {
          this.config.dailyStats.profit += profit;
        }
        this.config.dailyStats.totalTrades += 1;
        
        return true;
      } else {
        // TODO: Implement actual trading logic with Kraken API
        // const order = await this.client.createOrder({
        //   pair: symbol,
        //   type: action,
        //   ordertype: 'limit',
        //   price: price.toString(),
        //   volume: amount.toString()
        // });
        
        // Notify after successful execution
        // await this.notificationService.notifyTradeExecution(
        //   symbol, action, amount, price
        // );
        
        return false;
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      
      // Notify about the error
      await this.notificationService.sendNotification(
        NotificationType.RISK_ALERT,
        'Trade Execution Failed',
        `Failed to ${action} ${amount} ${symbol} at $${price}: ${error}`,
        { level: 'critical' }
      );
      
      return false;
    }
  }

  private findTriangularArbitrage(prices: any): Array<{
    symbols: string[];
    route: string[];
    profit: number;
  }> {
    const opportunities = [];
    const pairs = Object.keys(prices);

    for (const pair1 of pairs) {
      for (const pair2 of pairs) {
        for (const pair3 of pairs) {
          const profit = this.calculateTriangularProfit(
            prices[pair1],
            prices[pair2],
            prices[pair3]
          );

          if (profit > 0) {
            opportunities.push({
              symbols: [pair1, pair2, pair3],
              route: this.getArbitrageRoute(pair1, pair2, pair3),
              profit
            });
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.profit - a.profit);
  }

  private calculateTriangularProfit(price1: any, price2: any, price3: any): number {
    // Simplified profit calculation - replace with actual calculation based on order books
    const rate1 = parseFloat(price1.c[0]);
    const rate2 = parseFloat(price2.c[0]);
    const rate3 = parseFloat(price3.c[0]);
    
    return ((1 / rate1) * rate2 * rate3 - 1) * 100;
  }

  private getArbitrageRoute(pair1: string, pair2: string, pair3: string): string[] {
    return [pair1, pair2, pair3];
  }

  // Method to check if a new day has started and reset daily stats if needed
  private checkAndResetDailyStats(): void {
    const now = new Date();
    const lastReset = this.config.dailyStats.lastReset;
    
    if (now.getDate() !== lastReset.getDate() ||
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()) {
      
      // Send daily summary notification before reset
      const stats = {
        totalTrades: this.config.dailyStats.totalTrades,
        profit: this.config.dailyStats.profit,
        loss: this.config.dailyStats.loss,
        netProfit: this.config.dailyStats.profit - this.config.dailyStats.loss
      };
      
      // Reset stats
      this.resetDailyStats();
      
      // Send notification about daily summary
      this.notificationService.sendNotification(
        NotificationType.SYSTEM_ALERT,
        'Daily Trading Summary',
        `Total Trades: ${stats.totalTrades}\nProfit: $${stats.profit.toFixed(2)}\nLoss: $${stats.loss.toFixed(2)}\nNet Profit: $${stats.netProfit.toFixed(2)}`,
        stats
      );
    }
  }

  setConfig(newConfig: Partial<StrategyConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): StrategyConfig {
    return { ...this.config };
  }

  toggleTrading(enabled: boolean) {
    this.config.enabled = enabled;
    
    // Send notification about trading status change
    this.notificationService.sendNotification(
      NotificationType.SYSTEM_ALERT,
      `Trading ${enabled ? 'Enabled' : 'Disabled'}`,
      `Trading has been ${enabled ? 'enabled' : 'disabled'} in ${this.config.tradingMode} mode.`,
      { tradingMode: this.config.tradingMode }
    );
  }

  // Add daily stats reset
  private resetDailyStats() {
    this.config.dailyStats = {
      totalTrades: 0,
      profit: 0,
      loss: 0,
      lastReset: new Date()
    };
  }

  // Check if we should stop trading based on daily loss
  private shouldStopTrading(): boolean {
    if (this.config.dailyStats.loss >= this.config.maxDailyLoss) {
      // Notify about max loss reached
      this.notificationService.notifyRiskAlert(
        `Daily loss limit of $${this.config.maxDailyLoss} reached. Trading has been disabled.`,
        'critical'
      );
      
      // Disable trading
      this.config.enabled = false;
      
      return true;
    }
    return false;
  }

  async trainPredictionModel(xs: number[], ys: number[]) {
    await this.predictionModel.trainModel(xs, ys);
  }
} 