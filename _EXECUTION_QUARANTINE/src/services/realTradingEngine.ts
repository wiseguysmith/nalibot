import { LiveTradingEngine } from './liveTradingEngine';
import { LiveTrade } from '../types/index';
import { KrakenWrapper } from './krakenWrapper';
import { RiskManager } from './riskManager';
import { ExecutionManager } from '../../core/execution_manager';
import { createTradeRequest } from '../../core/governance_integration';

export interface RealTrade extends LiveTrade {
  orderId?: string;
  executionPrice?: number;
  fees?: number;
  slippage?: number;
}

export interface RealTradingConfig {
  apiKey: string;
  apiSecret: string;
  maxPositionSize: number;
  maxDailyLoss: number;
  enableRealTrading: boolean;
  testMode: boolean;
  executionManager?: ExecutionManager; // PHASE 1: Governance - required for execution
}

export class RealTradingEngine extends LiveTradingEngine {
  private kraken: KrakenWrapper;
  private riskManager: RiskManager;
  private isRealTrading: boolean = false;
  private config: RealTradingConfig;
  private realTrades: RealTrade[] = [];
  private executionManager?: ExecutionManager; // PHASE 1: Governance

  constructor(config: RealTradingConfig) {
    // PHASE 1: Pass executionManager to parent if provided
    super({
      ...config,
      executionManager: config.executionManager
    } as any);
    this.config = config;
    this.kraken = new KrakenWrapper(config.apiKey, config.apiSecret);
    this.riskManager = new RiskManager();
    this.isRealTrading = config.enableRealTrading;
    this.executionManager = config.executionManager;
  }

  /**
   * Get simulated price for testing
   */
  private getSimulatedPrice(pair: string): number {
    const basePrices = {
      'BTC/USD': 45000,
      'ETH/USD': 2800,
      'SOL/USD': 120,
      'ADA/USD': 0.45,
      'DOT/USD': 7.5
    };

    const basePrice = basePrices[pair as keyof typeof basePrices] || 100;
    const volatility = 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility;
    
    return basePrice * (1 + change);
  }

  /**
   * Execute a real trade with Kraken API
   * 
   * PHASE 1: All execution must go through ExecutionManager for governance enforcement.
   */
  async executeRealTrade(trade: Omit<RealTrade, 'id' | 'timestamp' | 'status'>): Promise<RealTrade> {
    try {
      // Create trade object
      const realTrade: RealTrade = {
        ...trade,
        id: `real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        status: 'pending'
      };

      // PHASE 1: Governance - ExecutionManager is required
      if (!this.executionManager) {
        console.error('[REAL_TRADING_ENGINE] ⚠️ CRITICAL: ExecutionManager not configured - governance required');
        realTrade.status = 'cancelled';
        return realTrade;
      }

      // PHASE 1: Convert to TradeRequest and execute through ExecutionManager
      const request = createTradeRequest({
        strategy: trade.strategy || 'unknown',
        pair: trade.pair,
        action: trade.type === 'buy' ? 'buy' : 'sell',
        amount: trade.amount,
        price: trade.price || this.getSimulatedPrice(trade.pair),
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit
      });

      // Execute through ExecutionManager (governance enforced)
      const result = await this.executionManager.executeTrade(request);

      if (!result.success) {
        // Trade blocked by governance
        realTrade.status = 'cancelled';
        console.warn(`[REAL_TRADING_ENGINE] Trade cancelled by governance`);
        return realTrade;
      }

      // Trade executed successfully through governance
      realTrade.status = 'executed';
      realTrade.orderId = result.orderId || `gov_${Date.now()}`;
      realTrade.executionPrice = result.executionPrice || request.price;
      
      // Calculate fees (0.26% Kraken fee)
      realTrade.fees = realTrade.executionPrice * trade.amount * 0.0026;
      realTrade.slippage = Math.abs((realTrade.executionPrice - request.price) / request.price) * 100;

      // Add to real trades history
      this.realTrades.push(realTrade);

      // Update performance metrics
      this.updateRealPerformance(realTrade);

      // Send notification
      await this.sendTradeNotification(realTrade);

      return realTrade;

    } catch (error) {
      console.error('Real trade execution error:', error);
      const failedTrade: RealTrade = {
        ...trade,
        id: `failed_${Date.now()}`,
        timestamp: new Date(),
        status: 'failed'
      };
      return failedTrade;
    }
  }

  /**
   * Execute order with Kraken API
   * 
   * PHASE 1: DEPRECATED - This method should not be used.
   * All execution must go through ExecutionManager.executeRealTrade().
   * 
   * @deprecated Use ExecutionManager.executeTrade() instead
   */
  private async executeKrakenOrder(trade: RealTrade): Promise<{
    success: boolean;
    orderId?: string;
    executionPrice?: number;
    fees?: number;
    slippage?: number;
    error?: string;
  }> {
    // PHASE 1: This method is deprecated - execution should go through ExecutionManager
    console.error('[REAL_TRADING_ENGINE] ⚠️ CRITICAL: executeKrakenOrder() is deprecated - use ExecutionManager.executeTrade()');
    
    // Return failure - this method should not be called
    return {
      success: false,
      error: 'Direct execution deprecated - use ExecutionManager'
    };
    
    /* DEPRECATED CODE - KEPT FOR REFERENCE ONLY
    try {
      // Get current market price for slippage calculation
      const ticker = await this.kraken.getTickerInformation([trade.pair.replace('/', '')]);
      const marketPrice = parseFloat(ticker.result[trade.pair.replace('/', '')].c[0]);

      // Prepare order data
      const orderData = {
        pair: trade.pair.replace('/', ''),
        type: trade.type.toLowerCase() as 'buy' | 'sell',
        ordertype: 'market' as const,
        volume: trade.amount.toString()
      };

      // Execute order - DEPRECATED: Should use ExecutionManager
      const result = await this.kraken.addOrder(orderData);

      if (result.error && result.error.length > 0) {
        return {
          success: false,
          error: result.error.join(', ')
        };
      }

      // Get order details
      const orderId = result.result.txid[0];
      const orderStatus = await this.kraken.getOrderStatus(orderId);
      
      // Calculate execution metrics
      const executionPrice = parseFloat(orderStatus.result[orderId].price);
      const fees = parseFloat(orderStatus.result[orderId].fee);
      const slippage = Math.abs(executionPrice - marketPrice) / marketPrice;

      return {
        success: true,
        orderId,
        executionPrice,
        fees,
        slippage
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform risk checks before trade execution
   */
  private async performRiskCheck(trade: RealTrade): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    try {
      // Check daily loss limit
      const dailyPnL = this.calculateDailyPnL();
      if (dailyPnL < -this.config.maxDailyLoss) {
        return {
          allowed: false,
          reason: `Daily loss limit exceeded: ${dailyPnL.toFixed(2)}%`
        };
      }

      // Check position size
      const portfolioValue = await this.getPortfolioValue();
      const positionSize = (trade.amount * this.getSimulatedPrice(trade.pair)) / portfolioValue;
      if (positionSize > this.config.maxPositionSize / 100) {
        return {
          allowed: false,
          reason: `Position size too large: ${(positionSize * 100).toFixed(2)}%`
        };
      }

      // Check account balance
      const balance = await this.kraken.getBalance();
      const requiredBalance = trade.amount * this.getSimulatedPrice(trade.pair);
      const availableBalance = parseFloat(balance.result.ZUSD || '0');
      
      if (availableBalance < requiredBalance) {
        return {
          allowed: false,
          reason: `Insufficient balance: need $${requiredBalance.toFixed(2)}, have $${availableBalance.toFixed(2)}`
        };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Risk check error:', error);
      return {
        allowed: false,
        reason: 'Risk check failed'
      };
    }
  }

  /**
   * Get current portfolio value
   */
  private async getPortfolioValue(): Promise<number> {
    try {
      const balance = await this.kraken.getBalance();
      let totalValue = 0;

      // Calculate USD value of all assets
      for (const [asset, amount] of Object.entries(balance.result)) {
        if (parseFloat(amount as string) > 0) {
          if (asset === 'ZUSD') {
            totalValue += parseFloat(amount as string);
          } else {
            // Get current price for non-USD assets
            const ticker = await this.kraken.getTickerInformation([`${asset}USD`]);
            const price = parseFloat(ticker.result[`${asset}USD`]?.c[0] || '0');
            totalValue += parseFloat(amount as string) * price;
          }
        }
      }

      return totalValue;
    } catch (error) {
      console.error('Error getting portfolio value:', error);
      return 1000; // Default fallback
    }
  }

  /**
   * Calculate daily P&L
   */
  private calculateDailyPnL(): number {
    const today = new Date().toDateString();
    const todayTrades = this.realTrades.filter(trade => 
      trade.timestamp.toDateString() === today
    );

    const dailyPnL = todayTrades.reduce((sum, trade) => {
      if (trade.profit !== undefined) {
        return sum + trade.profit;
      }
      return sum;
    }, 0);

    return dailyPnL;
  }

  /**
   * Update real trading performance metrics
   */
  private updateRealPerformance(trade: RealTrade): void {
    // Calculate profit/loss for completed trades
    if (trade.status === 'executed' && trade.executionPrice) {
      // This is a simplified P&L calculation
      // In a real implementation, you'd track positions and calculate P&L when closing
      const currentPrice = this.getCurrentPrice(trade.pair);
      const priceChange = trade.type === 'BUY' ? 
        (currentPrice - trade.executionPrice) / trade.executionPrice :
        (trade.executionPrice - currentPrice) / trade.executionPrice;
      
      trade.profit = trade.amount * trade.executionPrice * priceChange - (trade.fees || 0);
    }

    // Update overall performance
    this.updatePerformance();
  }

  /**
   * Send trade notification
   */
  private async sendTradeNotification(trade: RealTrade): Promise<void> {
    try {
      const message = `🤖 AutoBread Trade Executed
      
📊 Trade Details:
- Pair: ${trade.pair}
- Type: ${trade.type}
- Amount: ${trade.amount}
- Price: $${trade.executionPrice?.toFixed(2) || 'N/A'}
- Status: ${trade.status}
- Strategy: ${trade.strategy}

💰 P&L: ${trade.profit ? `$${trade.profit.toFixed(2)}` : 'Pending'}`;

      // Send to notification service
      // await this.notificationService.sendTradeAlert(message);
      console.log('Trade notification:', message);
    } catch (error) {
      console.error('Error sending trade notification:', error);
    }
  }

  /**
   * Get real trading statistics
   */
  getRealTradingStats() {
    const executedTrades = this.realTrades.filter(t => t.status === 'executed');
    const totalTrades = executedTrades.length;
    const winningTrades = executedTrades.filter(t => t.profit && t.profit > 0).length;
    const totalPnL = executedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalFees = executedTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
    const avgSlippage = executedTrades.reduce((sum, t) => sum + (t.slippage || 0), 0) / totalTrades;

    return {
      totalTrades,
      winningTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalPnL,
      totalFees,
      avgSlippage,
      avgSlippagePercent: avgSlippage * 100
    };
  }

  /**
   * Get recent real trades
   */
  getRecentRealTrades(limit: number = 10): RealTrade[] {
    return this.realTrades
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Enable/disable real trading
   */
  setRealTrading(enabled: boolean): void {
    this.isRealTrading = enabled;
    console.log(`Real trading ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if real trading is enabled
   */
  isRealTradingEnabled(): boolean {
    return this.isRealTrading;
  }
} 