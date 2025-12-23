import { KrakenWrapper } from './krakenWrapper';
import { db } from './db';
import { MarketDataService, MarketData } from './marketDataService';
import { StrategyService } from './strategyService';
import { getQuantApiClient } from './quant/quantApiClient';
import { blendSignals } from './quant/signalBlender';
import { ExecutionManager } from '../../core/execution_manager';
import { createTradeRequest } from '../../core/governance_integration';

export interface ProductionTrade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: Date;
  strategy: string;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  profit?: number;
  stopLoss?: number;
  takeProfit?: number;
  krakenOrderId?: string;
  fees?: number;
}

export interface ProductionPerformance {
  totalBalance: number;
  totalPnL: number;
  dailyPnL: number;
  winRate: number;
  totalTrades: number;
  activeTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastUpdate: Date;
  historicalData: { balance: number; timestamp: Date }[];
  targetProgress: number; // Progress towards $200 goal
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  xrpData?: {
    xrpAmount: number;
    xrpValue: number;
    usdBalance: number;
  };
}

export interface ProductionConfig {
  initialBalance: number;
  targetProfit: number;
  maxDrawdownPercentage: number;
  riskPerTradePercentage: number;
  maxDailyLossPercentage: number;
  positionSizePercentage: number;
  tradingPairs: string[];
  activeStrategies: string[];
  enableStopLoss: boolean;
  enableTakeProfit: boolean;
  autoStopOnDrawdown: boolean;
  executionManager?: ExecutionManager; // PHASE 1: Governance - required for execution
}

export class ProductionTradingEngine {
  private kraken: KrakenWrapper; // PHASE 1: Market data only
  private marketDataService: MarketDataService;
  private strategyService: StrategyService;
  private quantApiClient = getQuantApiClient();
  private executionManager?: ExecutionManager; // PHASE 1: Governance - required for execution
  private isRunning: boolean = false;
  private trades: ProductionTrade[] = [];
  private performance: ProductionPerformance;
  private config: ProductionConfig;
  private balance: number = 0;
  private dailyPnL: number = 0;
  private sessionStartTime: Date = new Date();
  private historicalData: { balance: number; timestamp: Date }[] = [];

  constructor(
    krakenApiKey: string,
    krakenApiSecret: string,
    config: ProductionConfig
  ) {
    this.kraken = new KrakenWrapper(krakenApiKey, krakenApiSecret); // PHASE 1: Market data only
    this.marketDataService = new MarketDataService();
    // PHASE 1: StrategyService does not receive exchange client
    this.strategyService = new StrategyService();
    this.config = config;
    this.executionManager = config.executionManager; // PHASE 1: Governance
    
    this.performance = {
      totalBalance: config.initialBalance,
      totalPnL: 0,
      dailyPnL: 0,
      winRate: 0,
      totalTrades: 0,
      activeTrades: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      lastUpdate: new Date(),
      historicalData: [],
      targetProgress: 0,
      riskLevel: 'LOW'
    };

    this.initializeHistoricalData();
  }

  private initializeHistoricalData() {
    this.historicalData.push({
      balance: this.config.initialBalance,
      timestamp: new Date()
    });
  }

  /**
   * Start production trading
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      console.log('🚀 Starting Production Trading Engine...');
      
      // Verify Kraken connection
      const balanceResponse = await this.kraken.getBalance();
      if (balanceResponse.error && balanceResponse.error.length > 0) {
        throw new Error(`Kraken API Error: ${balanceResponse.error.join(', ')}`);
      }

      console.log('✅ Kraken API connection verified');
      
      // Get current balance
      await this.updateBalance();
      
      this.isRunning = true;
      console.log(`💰 Starting with balance: $${this.balance.toFixed(2)}`);
      console.log(`🎯 Target profit: $${this.config.targetProfit}`);
      console.log(`🛡️ Risk management: ${this.config.maxDrawdownPercentage}% max drawdown`);

      // Log start
      console.log(`🚀 Trading Engine Started with $${this.balance.toFixed(2)} balance. Target: $${this.config.targetProfit} profit.`);

      // Start WebSocket market data feed
      await this.marketDataService.start(this.config.tradingPairs);
      
      // Set up WebSocket event handler for real-time price updates
      this.marketDataService.on('marketData', async (pair: string, marketData: MarketData) => {
        await this.handlePriceUpdate(pair, marketData);
      });
      
      // Periodic performance updates (not trading logic - that's triggered by WebSocket)
      setInterval(async () => {
        await this.updatePerformance();
        await this.checkRiskLimits();
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('❌ Failed to start production trading:', error);
      console.error('❌ Trading Engine Error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Stop production trading
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping Production Trading Engine...');
    this.isRunning = false;

    // Stop WebSocket feed
    this.marketDataService.stop();

    // Close any open positions
    await this.closeAllPositions();

    console.log(`🛑 Trading Engine Stopped. Final balance: $${this.balance.toFixed(2)}`);
  }

  /**
   * Update current balance from Kraken
   */
  private async updateBalance(): Promise<void> {
    try {
      const balanceResponse = await this.kraken.getBalance();
      if (balanceResponse.result) {
        // Calculate total USD balance
        let totalBalance = 0;
        for (const [asset, amount] of Object.entries(balanceResponse.result)) {
          if (asset === 'ZUSD' || asset === 'USD') {
            totalBalance += parseFloat(amount as string);
          } else {
            // For crypto assets, we'd need to get current prices
            // For now, we'll use a simplified approach
            const tickerResponse = await this.kraken.getTickerInformation([`${asset}USD`]);
            if (tickerResponse.result && tickerResponse.result[`${asset}USD`]) {
              const price = parseFloat(tickerResponse.result[`${asset}USD`].c?.[0] || '0');
              totalBalance += parseFloat(amount as string) * price;
            }
          }
        }
        this.balance = totalBalance;
      }
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }

  /**
   * Handle price update from WebSocket feed
   * This replaces the old executeTradingLogic polling method
   */
  private async handlePriceUpdate(pair: string, marketData: MarketData): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Check if we've reached our target
      if (this.balance >= this.config.initialBalance + this.config.targetProfit) {
        console.log('🎉 TARGET REACHED! Stopping trading...');
        await this.stop();
        return;
      }

      console.log(`[PROD TRADING] Processing tick for ${pair}: $${marketData.price.toFixed(2)}`);

      // 1. Generate technical signal
      const technicalSignal = await this.generateTechnicalSignal(pair, marketData);
      console.log(`[PROD TRADING] Technical signal: ${technicalSignal.toFixed(3)}`);

      // 2. Get quant signals from Python API
      const candles = await this.getRecentCandles(pair);
      const quantSignals = await this.quantApiClient.getQuantSignals(pair, candles);
      console.log(`[PROD TRADING] Quant combined signal: ${quantSignals.combined.toFixed(3)}`);

      // 3. Blend signals
      const blendedResult = await blendSignals(pair, technicalSignal, quantSignals);
      const finalSignal = blendedResult.value;
      console.log(`[PROD TRADING] Final blended signal: ${finalSignal.toFixed(3)}`);

      // 4. Execute strategies based on blended signal
      if (finalSignal > 0.2) {
        await this.executeMeanReversionStrategy(pair, marketData.price);
        await this.executeVolatilityBreakoutStrategy(pair, marketData.price);
      } else if (finalSignal < -0.2) {
        await this.executeArbitrageStrategy(pair, marketData.price);
      }

    } catch (error) {
      console.error(`[PROD TRADING] Error processing price update for ${pair}:`, error);
    }
  }

  /**
   * Generate technical signal from market data
   */
  private async generateTechnicalSignal(pair: string, marketData: MarketData): Promise<number> {
    try {
      const trendResult = await this.strategyService.checkTrendFollowing(pair);
      const meanReversionResult = await this.strategyService.checkMeanReversion(pair);
      
      let signal = 0;
      
      if (trendResult.shouldTrade) {
        signal += trendResult.action === 'buy' ? trendResult.confidence || 0.5 : -(trendResult.confidence || 0.5);
      }
      
      if (meanReversionResult.shouldTrade) {
        signal += meanReversionResult.action === 'buy' ? meanReversionResult.confidence || 0.5 : -(meanReversionResult.confidence || 0.5);
      }
      
      return Math.max(-1, Math.min(1, signal));
    } catch (error) {
      console.error(`Error generating technical signal for ${pair}:`, error);
      return 0;
    }
  }

  /**
   * Get recent candles for quant API
   */
  private async getRecentCandles(pair: string): Promise<Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      const ohlc = await this.kraken.getOHLCData(pair);
      const candles = Object.values(ohlc.result)[0];
      
      return candles.slice(-50).map((candle: any) => ({
        timestamp: parseInt(candle[0]) * 1000,
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[6]),
      }));
    } catch (error) {
      console.error(`Error getting candles for ${pair}:`, error);
      return [];
    }
  }

  /**
   * Mean Reversion Strategy
   */
  private async executeMeanReversionStrategy(pair: string, currentPrice: number): Promise<void> {
    if (!this.config.activeStrategies.includes('mean_reversion')) return;

    try {
      // Get OHLC data for RSI calculation
      const ohlcResponse = await this.kraken.getOHLCData(pair, 1); // 1 minute intervals
      if (ohlcResponse.result && ohlcResponse.result[pair]) {
        const ohlcData = ohlcResponse.result[pair];
        
        if (ohlcData.length >= 14) {
          // Calculate RSI
          const rsi = this.calculateRSI(ohlcData.slice(-14));
          
          // RSI-based mean reversion logic
          if (rsi < 30) { // Oversold - buy signal
            await this.executeBuyOrder(pair, currentPrice, 'mean_reversion');
          } else if (rsi > 70) { // Overbought - sell signal
            await this.executeSellOrder(pair, currentPrice, 'mean_reversion');
          }
        }
      }
    } catch (error) {
      console.error(`Error in mean reversion strategy for ${pair}:`, error);
    }
  }

  /**
   * Arbitrage Strategy
   */
  private async executeArbitrageStrategy(pair: string, currentPrice: number): Promise<void> {
    if (!this.config.activeStrategies.includes('arbitrage')) return;

    // For now, we'll implement a simple spread-based arbitrage
    // In a real implementation, you'd compare prices across exchanges
    try {
      const tickerResponse = await this.kraken.getTickerInformation([pair]);
      if (tickerResponse.result && tickerResponse.result[pair]) {
        const bid = parseFloat(tickerResponse.result[pair].b[0]);
        const ask = parseFloat(tickerResponse.result[pair].a[0]);
        const spread = (ask - bid) / bid * 100;

        // If spread is significant, execute arbitrage
        if (spread > 0.5) { // 0.5% spread threshold
          await this.executeBuyOrder(pair, ask, 'arbitrage');
        }
      }
    } catch (error) {
      console.error(`Error in arbitrage strategy for ${pair}:`, error);
    }
  }

  /**
   * Grid Trading Strategy
   */
  private async executeGridTradingStrategy(pair: string, currentPrice: number): Promise<void> {
    if (!this.config.activeStrategies.includes('grid_trading')) return;

    // XRP-optimized grid trading implementation
    const gridLevels = [0.97, 0.99, 1.01, 1.03]; // Tighter grid for XRP volatility
    
    for (const level of gridLevels) {
      const gridPrice = currentPrice * level;
      
      if (level < 1 && currentPrice <= gridPrice) {
        // Buy at lower grid levels
        await this.executeBuyOrder(pair, currentPrice, 'grid_trading');
      } else if (level > 1 && currentPrice >= gridPrice) {
        // Sell at higher grid levels
        await this.executeSellOrder(pair, currentPrice, 'grid_trading');
      }
    }
  }

  /**
   * Volatility Breakout Strategy (XRP-specific)
   */
  private async executeVolatilityBreakoutStrategy(pair: string, currentPrice: number): Promise<void> {
    if (!this.config.activeStrategies.includes('volatility_breakout')) return;

    try {
      // Get OHLC data for ATR calculation
      const ohlcResponse = await this.kraken.getOHLCData(pair, 1); // 1 minute intervals
      if (ohlcResponse.result && ohlcResponse.result[pair]) {
        const ohlcData = ohlcResponse.result[pair];
        
        if (ohlcData.length >= 14) {
          // Calculate ATR (Average True Range) for volatility
          const atr = this.calculateATR(ohlcData.slice(-14));
          const volatilityThreshold = currentPrice * 0.02; // 2% volatility threshold
          
          // Check for breakout
          if (atr > volatilityThreshold) {
            // High volatility - look for breakout opportunities
            const lastCandle = ohlcData[ohlcData.length - 1];
            const high = parseFloat(lastCandle[2]);
            const low = parseFloat(lastCandle[3]);
            
            if (currentPrice > high) {
              // Breakout above high - buy signal
              await this.executeBuyOrder(pair, currentPrice, 'volatility_breakout');
            } else if (currentPrice < low) {
              // Breakout below low - sell signal
              await this.executeSellOrder(pair, currentPrice, 'volatility_breakout');
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error in volatility breakout strategy for ${pair}:`, error);
    }
  }

  /**
   * Execute buy order
   * 
   * PHASE 1: All execution must go through ExecutionManager.
   */
  private async executeBuyOrder(pair: string, price: number, strategy: string): Promise<void> {
    try {
      // PHASE 1: Governance - ExecutionManager is required
      if (!this.executionManager) {
        console.error('[PRODUCTION_TRADING_ENGINE] ⚠️ CRITICAL: ExecutionManager not configured - governance required');
        return;
      }

      // Calculate position size based on risk management
      const positionSize = this.balance * (this.config.positionSizePercentage / 100);
      const amount = positionSize / price;

      // Check if we have enough balance
      if (positionSize > this.balance) {
        console.log(`Insufficient balance for ${pair} buy order`);
        return;
      }

      // PHASE 1: Create TradeRequest and execute through ExecutionManager
      const request = createTradeRequest({
        strategy,
        pair,
        action: 'buy',
        amount,
        price,
        stopLoss: price * 0.95,
        takeProfit: price * 1.02
      });

      // Execute through ExecutionManager (governance enforced)
      const result = await this.executionManager.executeTrade(request);

      if (!result.success) {
        console.warn(`[PRODUCTION_TRADING_ENGINE] Trade execution blocked by governance: ${pair}`);
        return;
      }

      // Convert ExecutionManager result to orderResponse format for compatibility
      const orderResponse = {
        result: {
          txid: [result.orderId || `gov_${Date.now()}`]
        }
      };

      if (orderResponse.result) {
        const trade: ProductionTrade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pair,
          type: 'BUY',
          amount: positionSize,
          price,
          timestamp: new Date(),
          strategy,
          status: 'executed',
          krakenOrderId: orderResponse.result.txid?.[0],
          stopLoss: price * 0.95,
          takeProfit: price * 1.02
        };

        this.trades.push(trade);
        console.log(`✅ BUY order executed: ${pair} $${positionSize.toFixed(2)} at $${price}`);

        // Save trade to database
        try {
          await db.trade.create({
            data: {
              symbol: pair,
              side: 'buy',
              size: positionSize,
              entryPrice: price,
            },
          });
          
          // Update position in database
          const normalizedSymbol = pair.replace('/', '');
          await db.position.upsert({
            where: { symbol: normalizedSymbol },
            update: {
              size: positionSize,
              avgPrice: price,
            },
            create: {
              symbol: normalizedSymbol,
              size: positionSize,
              avgPrice: price,
            },
          });
        } catch (dbError) {
          console.warn('Failed to save trade to database:', dbError);
        }

        // Log trade
        console.log(`✅ BUY trade executed: ${pair} $${positionSize.toFixed(2)} at $${price} (${strategy})`);
      }
    } catch (error) {
      console.error(`Error executing buy order for ${pair}:`, error);
    }
  }

  /**
   * Execute sell order
   * 
   * PHASE 1: All execution must go through ExecutionManager.
   */
  private async executeSellOrder(pair: string, price: number, strategy: string): Promise<void> {
    try {
      // PHASE 1: Governance - ExecutionManager is required
      if (!this.executionManager) {
        console.error('[PRODUCTION_TRADING_ENGINE] ⚠️ CRITICAL: ExecutionManager not configured - governance required');
        return;
      }

      // Calculate position size
      const positionSize = this.balance * (this.config.positionSizePercentage / 100);
      const amount = positionSize / price;

      // PHASE 1: Create TradeRequest and execute through ExecutionManager
      const request = createTradeRequest({
        strategy,
        pair,
        action: 'sell',
        amount,
        price
      });

      // Execute through ExecutionManager (governance enforced)
      const result = await this.executionManager.executeTrade(request);

      if (!result.success) {
        console.warn(`[PRODUCTION_TRADING_ENGINE] Trade execution blocked by governance: ${pair}`);
        return;
      }

      // Convert ExecutionManager result to orderResponse format for compatibility
      const orderResponse = {
        result: {
          txid: [result.orderId || `gov_${Date.now()}`]
        }
      };

      if (orderResponse.result) {
        const trade: ProductionTrade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pair,
          type: 'SELL',
          amount: positionSize,
          price,
          timestamp: new Date(),
          strategy,
          status: 'executed',
          krakenOrderId: orderResponse.result.txid?.[0]
        };

        this.trades.push(trade);
        console.log(`[TRADE EXECUTION] ✅ SELL order executed: ${pair} $${positionSize.toFixed(2)} at $${price}`);
        console.log(`  Strategy: ${strategy}, Order ID: ${orderResponse.result.txid?.[0]}`);

        // Save trade to database
        try {
          await db.trade.create({
            data: {
              symbol: pair,
              side: 'sell',
              size: positionSize,
              entryPrice: price,
            },
          });
          
          // Update position in database (reduce size or close)
          const normalizedSymbol = pair.replace('/', '');
          const existingPosition = await db.position.findUnique({
            where: { symbol: normalizedSymbol },
          });
          
          if (existingPosition) {
            const newSize = existingPosition.size - positionSize;
            if (newSize <= 0) {
              // Close position
              await db.position.delete({
                where: { symbol: normalizedSymbol },
              });
            } else {
              // Update position size
              await db.position.update({
                where: { symbol: normalizedSymbol },
                data: { size: newSize },
              });
            }
          }
        } catch (dbError) {
          console.warn('Failed to save trade to database:', dbError);
        }

        console.log(`✅ SELL trade executed: ${pair} $${positionSize.toFixed(2)} at $${price} (${strategy})`);
      }
    } catch (error) {
      console.error(`Error executing sell order for ${pair}:`, error);
    }
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(ohlcData: [number, string, string, string, string, string, string, number][]): number {
    const closes = ohlcData.map(candle => parseFloat(candle[4]));
    const gains = [];
    const losses = [];

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate ATR (Average True Range)
   */
  private calculateATR(ohlcData: [number, string, string, string, string, string, string, number][]): number {
    const trueRanges = [];

    for (let i = 1; i < ohlcData.length; i++) {
      const current = ohlcData[i];
      const previous = ohlcData[i - 1];
      
      const currentHigh = parseFloat(current[2]);
      const currentLow = parseFloat(current[3]);
      const previousClose = parseFloat(previous[4]);
      
      const tr1 = currentHigh - currentLow;
      const tr2 = Math.abs(currentHigh - previousClose);
      const tr3 = Math.abs(currentLow - previousClose);
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }

    return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  }

  /**
   * Update performance metrics
   */
  private async updatePerformance(): Promise<void> {
    await this.updateBalance();

    const totalPnL = this.balance - this.config.initialBalance;
    const winningTrades = this.trades.filter(t => t.profit && t.profit > 0).length;
    const currentDrawdown = this.calculateMaxDrawdown();

    this.performance = {
      totalBalance: this.balance,
      totalPnL,
      dailyPnL: this.dailyPnL,
      winRate: this.trades.length > 0 ? (winningTrades / this.trades.length) * 100 : 0,
      totalTrades: this.trades.length,
      activeTrades: this.trades.filter(t => t.status === 'executed').length,
      maxDrawdown: currentDrawdown,
      sharpeRatio: this.calculateSharpeRatio(),
      lastUpdate: new Date(),
      historicalData: [...this.historicalData],
      targetProgress: (totalPnL / this.config.targetProfit) * 100,
      riskLevel: this.calculateRiskLevel(currentDrawdown)
    };

    // Update historical data
    this.historicalData.push({
      balance: this.balance,
      timestamp: new Date()
    });

    if (this.historicalData.length > 100) {
      this.historicalData = this.historicalData.slice(-100);
    }
  }

  /**
   * Check risk limits and take action if needed
   */
  private async checkRiskLimits(): Promise<void> {
    const currentDrawdown = this.calculateMaxDrawdown();
    
    if (currentDrawdown >= this.config.maxDrawdownPercentage) {
      console.log(`🚨 MAX DRAWDOWN REACHED: ${currentDrawdown.toFixed(2)}%`);
      console.log(`🚨 DRAWDOWN ALERT: Maximum drawdown reached: ${currentDrawdown.toFixed(2)}%`);

      if (this.config.autoStopOnDrawdown) {
        await this.stop();
      }
    }

    if (this.dailyPnL <= -this.config.maxDailyLossPercentage) {
      console.log(`🚨 DAILY LOSS LIMIT REACHED: ${this.dailyPnL.toFixed(2)}%`);
      console.log(`🚨 DAILY LOSS ALERT: Daily loss limit reached: ${this.dailyPnL.toFixed(2)}%`);
    }
  }

  /**
   * Close all open positions
   */
  private async closeAllPositions(): Promise<void> {
    console.log('Closing all open positions...');
    // Implementation would depend on how you track open positions
    // For now, we'll just log the action
  }

  /**
   * Calculate max drawdown
   */
  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    let peak = this.config.initialBalance;

    for (const dataPoint of this.historicalData) {
      if (dataPoint.balance > peak) {
        peak = dataPoint.balance;
      }
      const drawdown = ((peak - dataPoint.balance) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(): number {
    if (this.historicalData.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < this.historicalData.length; i++) {
      const return_ = (this.historicalData[i].balance - this.historicalData[i - 1].balance) / this.historicalData[i - 1].balance;
      returns.push(return_);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(drawdown: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    if (drawdown < 5) return 'LOW';
    if (drawdown < 10) return 'MODERATE';
    if (drawdown < 15) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Get current performance
   */
  getPerformance(): ProductionPerformance {
    return { ...this.performance };
  }

  /**
   * Get recent trades
   */
  getRecentTrades(limit: number = 20): ProductionTrade[] {
    return this.trades.slice(-limit);
  }

  /**
   * Check if trading is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current balance
   */
  getBalance(): number {
    return this.balance;
  }
} 