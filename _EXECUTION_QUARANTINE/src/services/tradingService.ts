import { KrakenWrapper } from './krakenWrapper';
import { calculateMACD, calculateRSI, calculateBollingerBands } from '../utils/indicators';
import { NotificationService, NotificationType } from './notificationService';
import { StrategyService } from './strategyService';
import { CONFIG } from '../config';
import { ExecutionManager } from '../../core/execution_manager';
import { createTradeRequest, executeTradeWithRegimeCheck } from '../../core/governance_integration';
import { RegimeGate } from '../../core/regime_gate';

interface Position {
  symbol: string;
  size: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

interface TradeConfig {
  maxDrawdown: number;
  riskPerTrade: number;
  volatilityPeriod: number;
}

interface Balance {
  [key: string]: number;
}

export class TradingService {
  private client: KrakenWrapper; // PHASE 1: Only for market data, NOT execution
  private positions: Map<string, Position>;
  private config: TradeConfig;
  private notificationService: NotificationService;
  private strategyService: StrategyService;
  private executionManager?: ExecutionManager; // PHASE 1: Required for execution
  private regimeGate?: RegimeGate | null; // PHASE 2: Regime-aware governance (optional)
  private autoTradeInterval: NodeJS.Timeout | null = null;

  constructor(
    apiKey: string, 
    apiSecret: string,
    notificationService: NotificationService,
    executionManager?: ExecutionManager, // PHASE 1: Governance - required for execution
    regimeGate?: RegimeGate | null // PHASE 2: Regime-aware governance (optional)
  ) {
    this.client = new KrakenWrapper(apiKey, apiSecret); // PHASE 1: Market data only
    this.positions = new Map();
    this.config = {
      maxDrawdown: CONFIG.MAX_DRAWDOWN_PERCENTAGE,
      riskPerTrade: CONFIG.RISK_PER_TRADE_PERCENTAGE,
      volatilityPeriod: CONFIG.VOLATILITY_LOOKBACK_PERIOD
    };
    this.notificationService = notificationService;
    this.executionManager = executionManager;
    this.regimeGate = regimeGate; // PHASE 2: Regime-aware governance
    // PHASE 1: StrategyService does not receive exchange client
    this.strategyService = new StrategyService();
  }

  async getOHLC(symbol: string) {
    try {
      const response = await this.client.getOHLCData(symbol);
      if (response.error && response.error.length > 0) {
        throw new Error(response.error.join(', '));
      }

      const pairData = Object.values(response.result)[0];
      if (!Array.isArray(pairData)) {
        throw new Error('Invalid OHLC data format');
      }

      return pairData.map(candle => ({
        time: new Date(Number(candle[0]) * 1000).toISOString().split('T')[0],
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[6])
      }));
    } catch (error) {
      console.error('Error fetching OHLC data:', error);
      return [];
    }
  }

  async checkArbitrageOpportunities() {
    try {
      const pairs = await this.client.getTradablePairs();
      const prices = await this.client.getTickerInformation(Object.keys(pairs.result));

      // Simple triangular arbitrage check
      for (const basePair of Object.keys(prices.result)) {
        const opportunities = this.findArbitrageOpportunities(basePair, prices.result);
        for (const opp of opportunities) {
          console.log(`💰 Arbitrage opportunity: ${opp.path.join(' -> ')} - ${opp.profitPercent.toFixed(2)}% profit`);
        }
      }
    } catch (error) {
      console.error('Error checking arbitrage opportunities:', error);
    }
  }

  private findArbitrageOpportunities(basePair: string, prices: any) {
    // Implement triangular arbitrage logic here
    return [];
  }

  /**
   * Place an order through ExecutionManager (governance enforced)
   * 
   * PHASE 1: All execution must go through ExecutionManager.
   * This method coordinates order placement but does NOT execute directly.
   */
  async placeOrder(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    stopLossPercent: number,
    takeProfitPercent: number
  ): Promise<void> {
    try {
      // PHASE 1: Governance - ExecutionManager is required
      if (!this.executionManager) {
        throw new Error('ExecutionManager not configured - governance required for trade execution');
      }

      // Get current market price for calculations
      const ticker = await this.client.getTickerInformation([symbol]);
      const currentPrice = parseFloat(ticker.result[symbol].c[0]);
      
      const stopLossPrice = side === 'buy' 
        ? currentPrice * (1 - stopLossPercent / 100)
        : currentPrice * (1 + stopLossPercent / 100);
      
      const takeProfitPrice = side === 'buy'
        ? currentPrice * (1 + takeProfitPercent / 100)
        : currentPrice * (1 - takeProfitPercent / 100);

      // PHASE 1: Create TradeRequest and execute through ExecutionManager
      const request = createTradeRequest({
        strategy: 'trading_service',
        pair: symbol,
        action: side,
        amount: size,
        price: currentPrice,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice
      });

      // PHASE 2: Execute with regime check (if regime gate is available)
      const result = await executeTradeWithRegimeCheck(
        this.executionManager,
        this.regimeGate || null,
        request,
        symbol
      );

      if (!result.success) {
        throw new Error(`Trade execution blocked by governance: ${symbol}`);
      }

      // Update positions only if execution succeeded
      if (side === 'buy') {
        const position: Position = {
          symbol,
          size,
          entryPrice: currentPrice,
          stopLoss: stopLossPrice,
          takeProfit: takeProfitPrice
        };
        this.positions.set(symbol, position);
        await this.notificationService.notifyTradeExecution(symbol, 'buy', size, currentPrice);
      } else {
        this.positions.delete(symbol);
        await this.notificationService.notifyTradeExecution(symbol, 'sell', size, currentPrice);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  async analyzeTrend(symbol: string): Promise<{
    macd: any;
    rsi: number;
    bollingerBands: any;
  }> {
    const ohlc = await this.client.getOHLCData(symbol);
    const ohlcData = ohlc.result[symbol] || [];
    const closes = ohlcData.map(candle => parseFloat(candle[4]));

    return {
      macd: calculateMACD(closes),
      rsi: calculateRSI(closes),
      bollingerBands: calculateBollingerBands(closes)
    };
  }

  async calculatePositionSize(symbol: string, price: number): Promise<number> {
    const balance = await this.client.getBalance() as Balance;
    const portfolioValue = Object.values(balance).reduce((acc: number, curr: number) => acc + curr, 0);
    const riskAmount = portfolioValue * (this.config.riskPerTrade / 100);
    
    // Calculate ATR for volatility-based position sizing
    const ohlc = await this.client.getOHLCData(symbol);
    const ohlcData = ohlc.result[symbol] || [];
    const atr = this.calculateATR(ohlcData);
    
    return riskAmount / atr;
  }

  private calculateATR(ohlc: any[]): number {
    // Implement ATR calculation
    return 0; // Placeholder
  }

  async startAutoTrading() {
    if (this.autoTradeInterval) return;

    this.autoTradeInterval = setInterval(async () => {
      if (!this.strategyService.getConfig().enabled) return;

      try {
        // Check arbitrage opportunities
        const arbitrage = await this.strategyService.checkArbitrageOpportunities();
        if (arbitrage.shouldTrade && arbitrage.symbol && arbitrage.profit && arbitrage.route) {
          await this.executeArbitrageTrade({
            symbol: arbitrage.symbol,
            profit: arbitrage.profit,
            route: arbitrage.route
          });
        }

        // Check trend following opportunities for each symbol
        const symbols = ['BTC/USD', 'ETH/USD', 'XRP/USD'];
        for (const symbol of symbols) {
          const trend = await this.strategyService.checkTrendFollowing(symbol);
          if (trend.shouldTrade) {
            await this.executeTrendTrade(symbol, trend.action!, trend.reason!);
          }
        }
      } catch (error) {
        console.error('Auto trading error:', error);
        await this.notificationService.sendNotification(
          NotificationType.SYSTEM_ALERT,
          'Auto Trading Error',
          `Auto trading error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }, 60000); // Check every minute
  }

  async stopAutoTrading() {
    if (this.autoTradeInterval) {
      clearInterval(this.autoTradeInterval);
      this.autoTradeInterval = null;
    }
  }

  private async executeArbitrageTrade(opportunity: { symbol: string; profit: number; route: string[] }) {
    try {
      await this.notificationService.notifyArbitrageOpportunity(
        opportunity.route,
        opportunity.profit,
        0 // gasFees placeholder
      );

      // Execute the arbitrage trades
      for (const symbol of opportunity.route) {
        await this.placeOrder(
          symbol,
          'buy',
          this.strategyService.getConfig().maxInvestment,
          this.config.maxDrawdown,
          opportunity.profit
        );
      }
    } catch (error) {
      console.error('Arbitrage execution error:', error);
      throw error;
    }
  }

  private async executeTrendTrade(symbol: string, action: 'buy' | 'sell', reason: string) {
    try {
      const config = this.strategyService.getConfig();
      await this.placeOrder(
        symbol,
        action,
        config.maxInvestment,
        this.config.maxDrawdown,
        config.minProfitPercent
      );

      await this.notificationService.sendNotification(
        NotificationType.TRADE_EXECUTION,
        `Auto ${action.toUpperCase()} ${symbol}`,
        `Auto ${action.toUpperCase()} ${symbol} - ${reason}`
      );
    } catch (error) {
      console.error('Trend trade execution error:', error);
      throw error;
    }
  }

  /**
   * Execute a trade through ExecutionManager (governance enforced)
   * 
   * PHASE 1: All execution must go through ExecutionManager.
   */
  private async executeTrade(
    symbol: string,
    action: 'buy' | 'sell',
    amount: number,
    isTest: boolean = true
  ): Promise<void> {
    try {
      if (isTest) {
        // Simulate trade in test mode (no execution)
        console.log(`TEST MODE: ${action} ${amount} ${symbol}`);
        await this.notificationService.sendNotification(
          NotificationType.TRADE_EXECUTION,
          `TEST TRADE: ${action.toUpperCase()} ${amount} ${symbol}`,
          `TEST TRADE: ${action.toUpperCase()} ${amount} ${symbol}`
        );
        return;
      }

      // PHASE 1: Governance - ExecutionManager is required for real execution
      if (!this.executionManager) {
        throw new Error('ExecutionManager not configured - governance required for trade execution');
      }

      // Get current market price
      const ticker = await this.client.getTickerInformation([symbol]);
      const currentPrice = parseFloat(ticker.result[symbol].c[0]);

      // PHASE 1: Create TradeRequest and execute through ExecutionManager
      const request = createTradeRequest({
        strategy: 'trading_service',
        pair: symbol,
        action,
        amount,
        price: currentPrice
      });

      // PHASE 2: Execute with regime check (if regime gate is available)
      const result = await executeTradeWithRegimeCheck(
        this.executionManager,
        this.regimeGate || null,
        request,
        symbol
      );

      if (!result.success) {
        throw new Error(`Trade execution blocked by governance: ${symbol}`);
      }

      await this.notificationService.sendNotification(
        NotificationType.TRADE_EXECUTION,
        `LIVE TRADE: ${action.toUpperCase()} ${amount} ${symbol}`,
        `LIVE TRADE: ${action.toUpperCase()} ${amount} ${symbol}`
      );
    } catch (error) {
      console.error('Trade execution error:', error);
      throw error;
    }
  }
} 