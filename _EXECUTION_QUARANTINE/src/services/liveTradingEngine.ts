import { KrakenWrapper } from './krakenWrapper';
import { RiskManager } from './riskManager';
import { PortfolioManager } from './portfolioManager';
import { Strategy, TradeSignal, Position, Ticker, Balance, OrderResult } from '../types/index';
import { EventEmitter } from 'events';
import { db } from './db';
import { MarketDataService, MarketData } from './marketDataService';
import { StrategyService } from './strategyService';
import { getQuantApiClient, QuantSignals } from './quant/quantApiClient';
import { blendSignals, BlendedSignal } from './quant/signalBlender';
import { ExecutionManager } from '../../core/execution_manager';
import { createTradeRequest, executeTradeWithRegimeCheck } from '../../core/governance_integration';
import { RegimeGate } from '../../core/regime_gate';
import { CapitalGate } from '../../core/capital/capital_gate';

export interface LiveTradeConfig {
  apiKey: string;
  apiSecret: string;
  sandbox: boolean;
  maxPositionSize: number; // Maximum position size in USD
  maxDailyLoss: number; // Maximum daily loss in USD
  stopLossPercent: number; // Stop loss percentage
  takeProfitPercent: number; // Take profit percentage
  tradingPairs: string[]; // Trading pairs to monitor
  strategies: Strategy[]; // Active strategies
  emergencyStop?: boolean; // Emergency stop flag
  executionManager?: ExecutionManager; // PHASE 1: Governance - required for trade execution
  regimeGate?: RegimeGate | null; // PHASE 2: Regime-aware governance (optional)
  capitalGate?: CapitalGate | null; // PHASE 3: Capital governance (optional)
}

export interface LiveTradeResult {
  success: boolean;
  orderId?: string;
  error?: string;
  executionPrice?: number;
  quantity?: number;
  timestamp: number;
  strategy: string;
  signal: TradeSignal;
}

export class LiveTradingEngine extends EventEmitter {
  private kraken: KrakenWrapper;
  private riskManager: RiskManager;
  private portfolioManager: PortfolioManager;
  private marketDataService: MarketDataService;
  private strategyService: StrategyService;
  private quantApiClient = getQuantApiClient();
  private config: LiveTradeConfig;
  private executionManager?: ExecutionManager; // PHASE 1: Governance - required for execution
  private regimeGate?: RegimeGate | null; // PHASE 2: Regime-aware governance
  private capitalGate?: CapitalGate | null; // PHASE 3: Capital governance (optional)
  private _isRunning: boolean = false;
  private activePositions: Map<string, Position> = new Map();
  private dailyPnL: number = 0;
  private dailyTrades: number = 0;
  private lastTradeTime: number = 0;
  private positionMonitoringInterval: NodeJS.Timeout | null = null; // Only for position checks

  constructor(config: LiveTradeConfig) {
    super();
    this.config = config;
    this.kraken = new KrakenWrapper(config.apiKey, config.apiSecret); // PHASE 1: Market data only
    this.riskManager = new RiskManager();
    this.portfolioManager = new PortfolioManager();
    this.marketDataService = new MarketDataService();
    // PHASE 1: StrategyService no longer receives exchange client
    this.strategyService = new StrategyService();
    this.executionManager = config.executionManager; // PHASE 1: Governance
    this.regimeGate = config.regimeGate; // PHASE 2: Regime-aware governance
    this.capitalGate = config.capitalGate; // PHASE 3: Capital governance
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the live trading engine
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Live Trading Engine...');
      
      // Test Kraken connection
      const balance = await this.kraken.getBalance();
      if (!balance) {
        throw new Error('Failed to connect to Kraken API');
      }
      
      console.log('✅ Kraken connection established');
      console.log(`💰 Available balance: $${balance.totalUSD.toFixed(2)}`);
      
      // Initialize risk manager
      await this.riskManager.initialize({
        maxPositionSize: this.config.maxPositionSize,
        maxDailyLoss: this.config.maxDailyLoss,
        stopLossPercent: this.config.stopLossPercent,
        takeProfitPercent: this.config.takeProfitPercent
      });
      
      // Initialize portfolio manager
      await this.portfolioManager.initialize();
      
      // Load existing positions
      await this.loadExistingPositions();
      
      console.log('✅ Live Trading Engine initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Live Trading Engine:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Start live trading with WebSocket integration
   */
  async start(): Promise<void> {
    if (this._isRunning) {
      console.log('⚠️ Trading engine is already running');
      return;
    }

    try {
      console.log('🚀 Starting Live Trading with WebSocket integration...');
      this._isRunning = true;
      
      // Start WebSocket market data feed
      await this.marketDataService.start(this.config.tradingPairs);
      
      // Set up WebSocket event handler for real-time price updates
      this.marketDataService.on('marketData', async (pair: string, marketData: MarketData) => {
        await this.handlePriceUpdate(pair, marketData);
      });
      
      // Start position monitoring (only for stop-loss/take-profit checks)
      this.startPositionMonitoring();
      
      this.emit('started');
      console.log('✅ Live Trading started successfully with WebSocket feed');
      
    } catch (error) {
      console.error('❌ Failed to start live trading:', error);
      this.emit('error', error);
      this._isRunning = false;
    }
  }

  /**
   * Stop live trading
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      console.log('⚠️ Trading engine is not running');
      return;
    }

    try {
      console.log('🛑 Stopping Live Trading...');
      this._isRunning = false;
      
      // Stop WebSocket feed
      this.marketDataService.stop();
      
      // Stop position monitoring
      if (this.positionMonitoringInterval) {
        clearInterval(this.positionMonitoringInterval);
        this.positionMonitoringInterval = null;
      }
      
      // Close all open positions if emergency stop
      if (this.config.emergencyStop) {
        await this.closeAllPositions();
      }
      
      this.emit('stopped');
      console.log('✅ Live Trading stopped successfully');
      
    } catch (error) {
      console.error('❌ Failed to stop live trading:', error);
      this.emit('error', error);
    }
  }

  /**
   * Emergency stop - immediately close all positions
   */
  async emergencyStop(): Promise<void> {
    try {
      console.log('🚨 EMERGENCY STOP - Closing all positions...');
      
      // Stop the engine
      this._isRunning = false;
      
      // Close all positions immediately
      await this.closeAllPositions();
      
      this.emit('emergencyStop');
      console.log('✅ Emergency stop completed');
      
    } catch (error) {
      console.error('❌ Emergency stop failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Execute a trade based on strategy signal
   * 
   * PHASE 1: All execution must go through ExecutionManager for governance enforcement.
   */
  async executeTrade(signal: TradeSignal, pair: string, strategy: string): Promise<LiveTradeResult> {
    try {
      // Check if trading is allowed
      if (!this._isRunning) {
        return {
          success: false,
          error: 'Trading engine is not running',
          timestamp: Date.now(),
          strategy,
          signal
        };
      }

      // PHASE 1: Governance - ExecutionManager is required
      if (!this.executionManager) {
        console.error('[LIVE_TRADING_ENGINE] ⚠️ CRITICAL: ExecutionManager not configured - governance required');
        return {
          success: false,
          error: 'ExecutionManager not configured - governance required for trade execution',
          timestamp: Date.now(),
          strategy,
          signal
        };
      }

      // Get current market price
      const ticker = await this.kraken.getTicker(pair);
      if (!ticker) {
        return {
          success: false,
          error: 'Failed to get market price',
          timestamp: Date.now(),
          strategy,
          signal
        };
      }

      // Calculate position size
      const positionSize = await this.calculatePositionSize(signal, pair, ticker.last);
      
      // PHASE 1: Convert to TradeRequest and execute through ExecutionManager
      const request = createTradeRequest({
        strategy,
        pair,
        action: signal === TradeSignal.BUY ? 'buy' : 'sell',
        amount: positionSize.quantity,
        price: positionSize.price,
        stopLoss: positionSize.price * (1 - (this.config.stopLossPercent / 100)),
        takeProfit: positionSize.price * (1 + (this.config.takeProfitPercent / 100))
      });

      // PHASE 2 & 3: Execute with regime and capital checks
      // Capital check → Regime check → Phase 1 governance
      const result = await executeTradeWithRegimeCheck(
        this.executionManager,
        this.regimeGate || null,
        this.capitalGate || null,
        request,
        pair
      );
      
      // Convert result back to LiveTradeResult format
      if (!result.success) {
        return {
          success: false,
          error: 'Trade execution blocked by governance',
          timestamp: result.timestamp.getTime(),
          strategy,
          signal
        };
      }

      // Trade executed successfully through governance
      // Use result from ExecutionManager (includes orderId if available)
      const orderResult = {
        success: true,
        orderId: result.orderId || `gov_${Date.now()}`,
        price: result.executionPrice || positionSize.price,
        quantity: result.quantity || positionSize.quantity
      };

      if (result.success && orderResult.success) {
        // Debug logging
        console.log(`[TRADE EXECUTION] ${signal === TradeSignal.BUY ? 'BUY' : 'SELL'} order executed for ${pair}`);
        console.log(`  Price: $${positionSize.price.toFixed(2)}, Quantity: ${positionSize.quantity.toFixed(8)}`);
        console.log(`  Strategy: ${strategy}, Order ID: ${orderResult.orderId}`);
        
        // Save trade to database
        try {
          await db.trade.create({
            data: {
              symbol: pair,
              side: signal === TradeSignal.BUY ? 'buy' : 'sell',
              size: positionSize.quantity,
              entryPrice: positionSize.price,
            },
          });
        } catch (dbError) {
          console.warn('Failed to save trade to database:', dbError);
        }
        
        // Update position tracking
        await this.updatePosition(signal, pair, positionSize, orderResult.orderId);
        
        // Update position in database
        try {
          const normalizedSymbol = pair.replace('/', '');
          const existingPosition = await db.position.findUnique({
            where: { symbol: normalizedSymbol },
          });
          
          if (signal === TradeSignal.BUY) {
            if (existingPosition) {
              // Add to existing position - calculate new average price
              const totalSize = existingPosition.size + positionSize.quantity;
              const newAvgPrice = 
                (existingPosition.avgPrice * existingPosition.size + positionSize.price * positionSize.quantity) / totalSize;
              
              await db.position.update({
                where: { symbol: normalizedSymbol },
                data: {
                  size: totalSize,
                  avgPrice: newAvgPrice,
                },
              });
            } else {
              // Create new position
              await db.position.create({
                data: {
                  symbol: normalizedSymbol,
                  size: positionSize.quantity,
                  avgPrice: positionSize.price,
                },
              });
            }
          } else if (signal === TradeSignal.SELL && existingPosition) {
            // Reduce position size
            const newSize = existingPosition.size - positionSize.quantity;
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
          console.warn('Failed to update position in database:', dbError);
        }
        
        // Update daily metrics
        this.updateDailyMetrics(signal, pair, positionSize);
        
        // Emit trade event
        this.emit('trade', {
          signal,
          pair,
          strategy,
          quantity: positionSize.quantity,
          price: positionSize.price,
          orderId: orderResult.orderId,
          timestamp: Date.now()
        });

        return {
          success: true,
          orderId: orderResult.orderId,
          executionPrice: positionSize.price,
          quantity: positionSize.quantity,
          timestamp: Date.now(),
          strategy,
          signal
        };
      } else {
        // This should never be reached since ExecutionManager blocks failed trades
        // But keeping for safety
        return {
          success: false,
          error: 'Trade execution failed',
          timestamp: Date.now(),
          strategy,
          signal
        };
      }

    } catch (error) {
      console.error('❌ Trade execution failed:', error);
      this.emit('error', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
        strategy,
        signal
      };
    }
  }

  /**
   * Calculate optimal position size based on risk management
   */
  private async calculatePositionSize(signal: TradeSignal, pair: string, currentPrice: number): Promise<{
    quantity: number;
    price: number;
    totalValue: number;
  }> {
    // Get available balance
    const balance = await this.kraken.getBalance();
    const availableUSD = balance.availableUSD;
    
    // Calculate position size based on risk management rules
    const maxPositionValue = Math.min(
      this.config.maxPositionSize,
      availableUSD * 0.1 // Use max 10% of available balance per trade
    );
    
    // Calculate quantity
    const quantity = maxPositionValue / currentPrice;
    
    // Round quantity to appropriate decimal places
    const roundedQuantity = this.roundQuantity(quantity, pair);
    
    return {
      quantity: roundedQuantity,
      price: currentPrice,
      totalValue: roundedQuantity * currentPrice
    };
  }

  /**
   * Round quantity to appropriate decimal places for the trading pair
   */
  private roundQuantity(quantity: number, pair: string): number {
    // Kraken has different precision requirements for different pairs
    const precision = this.getPairPrecision(pair);
    return Math.floor(quantity * Math.pow(10, precision)) / Math.pow(10, precision);
  }

  /**
   * Get precision for a trading pair
   */
  private getPairPrecision(pair: string): number {
    // Default precision for most pairs
    const precisionMap: { [key: string]: number } = {
      'BTC/USD': 5,
      'ETH/USD': 4,
      'XRP/USD': 1,
      'ADA/USD': 0,
      'SOL/USD': 2
    };
    
    return precisionMap[pair] || 4;
  }

  /**
   * Update position tracking
   */
  private async updatePosition(signal: TradeSignal, pair: string, positionSize: any, orderId: string): Promise<void> {
    const existingPosition = this.activePositions.get(pair);
    
    if (signal === TradeSignal.BUY) {
      if (existingPosition) {
        // Add to existing position
        existingPosition.quantity += positionSize.quantity;
        existingPosition.averagePrice = 
          (existingPosition.averagePrice * existingPosition.quantity + positionSize.price * positionSize.quantity) / 
          (existingPosition.quantity + positionSize.quantity);
      } else {
        // Create new position
        this.activePositions.set(pair, {
          pair,
          quantity: positionSize.quantity,
          averagePrice: positionSize.price,
          entryTime: Date.now(),
          strategy: 'LiveTrading',
          stopLoss: positionSize.price * (1 - this.config.stopLossPercent / 100),
          takeProfit: positionSize.price * (1 + this.config.takeProfitPercent / 100)
        });
      }
    } else if (signal === TradeSignal.SELL && existingPosition) {
      // Reduce position
      existingPosition.quantity -= positionSize.quantity;
      
      if (existingPosition.quantity <= 0) {
        // Position closed
        this.activePositions.delete(pair);
      }
    }
  }

  /**
   * Update daily trading metrics
   */
  private updateDailyMetrics(signal: TradeSignal, pair: string, positionSize: any): void {
    this.dailyTrades++;
    this.lastTradeTime = Date.now();
    
    // Calculate P&L (simplified - would need actual trade data)
    if (signal === TradeSignal.SELL) {
      // This is a simplified P&L calculation
      // In production, you'd track actual entry/exit prices
      this.dailyPnL += positionSize.totalValue * 0.01; // Assume 1% profit for demo
    }
  }

  /**
   * Handle price update from WebSocket feed
   * This is called on every incoming tick
   */
  private async handlePriceUpdate(pair: string, marketData: MarketData): Promise<void> {
    if (!this._isRunning) return;
    
    try {
      console.log(`[TRADING LOOP] Processing tick for ${pair}: $${marketData.price.toFixed(2)}`);
      
      // PHASE 2: Update price history for regime detection
      if (this.regimeGate) {
        this.regimeGate.updatePriceHistory(pair, marketData.price);
      }
      
      // 1. Generate technical signal
      const technicalSignal = await this.generateTechnicalSignal(pair, marketData);
      console.log(`[TRADING LOOP] Technical signal: ${technicalSignal.toFixed(3)}`);
      
      // 2. Get quant signals from Python API
      const candles = await this.getRecentCandles(pair);
      const quantSignals = await this.quantApiClient.getQuantSignals(pair, candles);
      console.log(`[TRADING LOOP] Quant combined signal: ${quantSignals.combined.toFixed(3)}`);
      
      // 3. Blend signals
      const blendedResult = await blendSignals(pair, technicalSignal, quantSignals);
      const finalSignal = blendedResult.value;
      console.log(`[TRADING LOOP] Final blended signal: ${finalSignal.toFixed(3)}`);
      
      // 4. Evaluate risk
      const riskCheck = await this.riskManager.checkTradeRisk(
        finalSignal > 0.2 ? TradeSignal.BUY : finalSignal < -0.2 ? TradeSignal.SELL : TradeSignal.HOLD,
        pair
      );
      
      if (!riskCheck.allowed) {
        console.log(`[RISK MANAGER] Trade blocked: ${riskCheck.reason}`);
        return;
      }
      
      // 5. Execute trade if signal is strong enough
      if (finalSignal > 0.2) {
        await this.executeTrade(TradeSignal.BUY, pair, 'HybridStrategy');
      } else if (finalSignal < -0.2) {
        await this.executeTrade(TradeSignal.SELL, pair, 'HybridStrategy');
      }
      
    } catch (error) {
      console.error(`[TRADING LOOP] Error processing price update for ${pair}:`, error);
    }
  }

  /**
   * Generate technical signal from market data
   */
  private async generateTechnicalSignal(pair: string, marketData: MarketData): Promise<number> {
    try {
      // Use StrategyService to generate technical signals
      const trendResult = await this.strategyService.checkTrendFollowing(pair);
      const meanReversionResult = await this.strategyService.checkMeanReversion(pair);
      
      // Combine signals (simplified - could be more sophisticated)
      let signal = 0;
      
      if (trendResult.shouldTrade) {
        signal += trendResult.action === 'buy' ? trendResult.confidence || 0.5 : -(trendResult.confidence || 0.5);
      }
      
      if (meanReversionResult.shouldTrade) {
        signal += meanReversionResult.action === 'buy' ? meanReversionResult.confidence || 0.5 : -(meanReversionResult.confidence || 0.5);
      }
      
      // Normalize to [-1, 1]
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
   * Start position monitoring (only for stop-loss/take-profit checks)
   * Uses WebSocket price updates, but checks positions periodically
   */
  private startPositionMonitoring(): void {
    this.positionMonitoringInterval = setInterval(async () => {
      if (!this._isRunning) return;
      
      try {
        // Check for stop-loss and take-profit triggers
        await this.checkPositionExits();
        
        // Update position P&L
        await this.updatePositionPnL();
        
      } catch (error) {
        console.error('Position monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds (positions don't need millisecond precision)
  }

  /**
   * Check for position exits (stop-loss, take-profit)
   */
  private async checkPositionExits(): Promise<void> {
    for (const [pair, position] of this.activePositions) {
      try {
        // Use cached market data from WebSocket instead of REST call
        const marketData = this.marketDataService.getMarketData(pair);
        if (!marketData) {
          // Fallback to REST if WebSocket data not available
          const ticker = await this.kraken.getTicker(pair);
          if (!ticker) continue;
          const currentPrice = ticker.last;
          
          // Check stop-loss
          if (currentPrice <= position.stopLoss) {
            console.log(`🛑 Stop-loss triggered for ${pair} at ${currentPrice}`);
            await this.executeTrade(TradeSignal.SELL, pair, 'StopLoss');
          }
          
          // Check take-profit
          if (currentPrice >= position.takeProfit) {
            console.log(`🎯 Take-profit triggered for ${pair} at ${currentPrice}`);
            await this.executeTrade(TradeSignal.SELL, pair, 'TakeProfit');
          }
          continue;
        }
        
        const currentPrice = marketData.price;
        
        // Check stop-loss
        if (currentPrice <= position.stopLoss) {
          console.log(`🛑 Stop-loss triggered for ${pair} at ${currentPrice}`);
          await this.executeTrade(TradeSignal.SELL, pair, 'StopLoss');
        }
        
        // Check take-profit
        if (currentPrice >= position.takeProfit) {
          console.log(`🎯 Take-profit triggered for ${pair} at ${currentPrice}`);
          await this.executeTrade(TradeSignal.SELL, pair, 'TakeProfit');
        }
        
      } catch (error) {
        console.error(`Error checking position exits for ${pair}:`, error);
      }
    }
  }

  /**
   * Update position P&L
   */
  private async updatePositionPnL(): Promise<void> {
    for (const [pair, position] of this.activePositions) {
      try {
        // Use cached market data from WebSocket instead of REST call
        const marketData = this.marketDataService.getMarketData(pair);
        if (!marketData) {
          // Fallback to REST if WebSocket data not available
          const ticker = await this.kraken.getTicker(pair);
          if (!ticker) continue;
          const currentPrice = ticker.last;
          
          const unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity;
          
          // Emit P&L update
          this.emit('positionUpdate', {
            pair,
            unrealizedPnL,
            currentPrice,
            timestamp: Date.now()
          });
          continue;
        }
        
        const currentPrice = marketData.price;
        const unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity;
        
        // Emit P&L update
        this.emit('positionUpdate', {
          pair,
          unrealizedPnL,
          currentPrice,
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.error(`Error updating P&L for ${pair}:`, error);
      }
    }
  }

  /**
   * Run a strategy and get trading signal
   */
  private async runStrategy(strategy: Strategy): Promise<TradeSignal> {
    try {
      // This would get real-time market data and run the strategy
      // For now, return HOLD to prevent excessive trading
      return TradeSignal.HOLD;
    } catch (error) {
      console.error('Strategy execution error:', error);
      return TradeSignal.HOLD;
    }
  }

  /**
   * Close all open positions
   */
  private async closeAllPositions(): Promise<void> {
    console.log('🔄 Closing all open positions...');
    
    for (const [pair, position] of this.activePositions) {
      try {
        await this.executeTrade(TradeSignal.SELL, pair, 'EmergencyClose');
        console.log(`✅ Closed position in ${pair}`);
      } catch (error) {
        console.error(`❌ Failed to close position in ${pair}:`, error);
      }
    }
  }

  /**
   * Load existing positions from Kraken
   */
  private async loadExistingPositions(): Promise<void> {
    try {
      const positions = await this.kraken.getOpenPositions();
      
      for (const position of positions) {
        this.activePositions.set(position.pair, {
          pair: position.pair,
          quantity: position.quantity,
          averagePrice: position.averagePrice,
          entryTime: position.entryTime,
          strategy: position.strategy || 'Unknown',
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit
        });
      }
      
      console.log(`📊 Loaded ${this.activePositions.size} existing positions`);
      
    } catch (error) {
      console.error('Failed to load existing positions:', error);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.on('error', (error) => {
      console.error('Live Trading Engine Error:', error);
    });
    
    this.on('trade', (tradeData) => {
      console.log('📊 Trade executed:', tradeData);
    });
    
    this.on('positionUpdate', (update) => {
      console.log('📈 Position update:', update);
    });
  }

  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    activePositions: number;
    dailyPnL: number;
    dailyTrades: number;
    lastTradeTime: number;
  } {
    return {
      isRunning: this._isRunning,
      activePositions: this.activePositions.size,
      dailyPnL: this.dailyPnL,
      dailyTrades: this.dailyTrades,
      lastTradeTime: this.lastTradeTime
    };
  }

  /**
   * Get active positions
   */
  getActivePositions(): Position[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Get performance data for API endpoints
   */
  getPerformance(): any {
    return {
      totalBalance: 1000, // Placeholder - should come from portfolio manager
      totalPnL: this.dailyPnL,
      dailyPnL: this.dailyPnL,
      winRate: 0, // Placeholder - should calculate from trade history
      totalTrades: this.dailyTrades,
      activeTrades: this.activePositions.size,
      maxDrawdown: 0, // Placeholder - should calculate from historical data
      sharpeRatio: 0, // Placeholder - should calculate from historical data
      lastUpdate: new Date(),
      historicalData: []
    };
  }

  /**
   * Get strategy performance data for API endpoints
   */
  getStrategyPerformance(): any[] {
    // Placeholder - should return actual strategy performance
    return [];
  }

  /**
   * Get recent trades for API endpoints
   */
  getRecentTrades(limit: number = 20): any[] {
    // Placeholder - should return actual trade history
    return [];
  }

  /**
   * Get analytics data for API endpoints
   */
  getAnalytics(): any {
    return {
      totalTrades: this.dailyTrades,
      winningTrades: 0, // Placeholder - should calculate from trade history
      losingTrades: 0, // Placeholder - should calculate from trade history
      winRate: 0, // Placeholder - should calculate from trade history
      totalProfit: 0, // Placeholder - should calculate from trade history
      totalLoss: 0, // Placeholder - should calculate from trade history
      profitFactor: 0, // Placeholder - should calculate from trade history
      averageWin: 0, // Placeholder - should calculate from trade history
      averageLoss: 0, // Placeholder - should calculate from trade history
      largestWin: 0, // Placeholder - should calculate from trade history
      largestLoss: 0, // Placeholder - should calculate from trade history
      consecutiveWins: 0, // Placeholder - should calculate from trade history
      consecutiveLosses: 0 // Placeholder - should calculate from trade history
    };
  }

  /**
   * Get historical data for API endpoints
   */
  getHistoricalData(): any[] {
    // Placeholder - should return actual historical data
    return [];
  }

  /**
   * Check if trading is active for API endpoints
   */
  isActive(): boolean {
    return this._isRunning;
  }

  /**
   * Getter for isRunning status
   */
  get isRunning(): boolean {
    return this._isRunning;
  }
}

// Create and export a default instance for API endpoints
const defaultConfig: LiveTradeConfig = {
  apiKey: process.env.KRAKEN_API_KEY || '',
  apiSecret: process.env.KRAKEN_API_SECRET || '',
  sandbox: true, // Default to sandbox for safety
  maxPositionSize: 100, // $100 max position size
  maxDailyLoss: 50, // $50 max daily loss
  stopLossPercent: 3, // 3% stop loss
  takeProfitPercent: 6, // 6% take profit
  tradingPairs: ['BTC/USD', 'ETH/USD'],
  strategies: []
};

export const liveTradingEngine = new LiveTradingEngine(defaultConfig); 