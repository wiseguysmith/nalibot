/**
 * Safety Engine
 * Enforces trading limits and risk management rules
 * Prevents excessive losses and protects capital
 */

class SafetyEngine {
  constructor(config = {}) {
    // Safety limits
    this.maxDailyTrades = config.maxDailyTrades || 50;
    this.maxDailyLossPercentage = config.maxDailyLossPercentage || 0.25; // 25% max daily loss
    this.maxPositionSizePercentage = config.maxPositionSizePercentage || 0.30; // 30% max position size
    this.volatilityThreshold = config.volatilityThreshold || 0.10; // 10% volatility threshold
    this.stopTradingOnLoss = config.stopTradingOnLoss !== false; // Default: true
    
    // Daily tracking
    this.dailyStats = {
      trades: 0,
      loss: 0,
      startBalance: null,
      lastReset: new Date()
    };

    // Trading state
    this.isTradingPaused = false;
    this.pauseReason = null;
  }

  /**
   * Reset daily statistics
   */
  resetDailyStats(startBalance) {
    this.dailyStats = {
      trades: 0,
      loss: 0,
      startBalance: startBalance,
      lastReset: new Date()
    };
    this.isTradingPaused = false;
    this.pauseReason = null;
  }

  /**
   * Check if we should reset daily stats (new day)
   */
  checkDailyReset() {
    const now = new Date();
    const lastReset = new Date(this.dailyStats.lastReset);
    
    // Reset if it's a new day
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()) {
      return true;
    }
    
    return false;
  }

  /**
   * Run safety checks before executing a trade
   * @param {Object} trade - Trade object with amount, price, type, etc.
   * @param {Object} portfolio - Current portfolio state
   * @param {Object} marketData - Current market data
   * @returns {Object} Safety check result
   */
  runSafetyChecks(trade, portfolio, marketData = {}) {
    const checks = {
      allowed: true,
      warnings: [],
      errors: [],
      adjustedTrade: { ...trade }
    };

    // Check if trading is paused
    if (this.isTradingPaused) {
      checks.allowed = false;
      checks.errors.push(`Trading is paused: ${this.pauseReason}`);
      return checks;
    }

    // Check daily reset
    if (this.checkDailyReset() && portfolio.balance) {
      this.resetDailyStats(portfolio.balance);
    }

    // Check max daily trades
    if (this.dailyStats.trades >= this.maxDailyTrades) {
      checks.allowed = false;
      checks.errors.push(`Daily trade limit reached: ${this.maxDailyTrades} trades`);
      return checks;
    }

    // Check position size
    const positionSizePercentage = trade.amount / portfolio.balance;
    if (positionSizePercentage > this.maxPositionSizePercentage) {
      checks.allowed = false;
      checks.errors.push(`Position size ${(positionSizePercentage * 100).toFixed(2)}% exceeds maximum ${(this.maxPositionSizePercentage * 100).toFixed(2)}%`);
      // Suggest adjusted amount
      checks.adjustedTrade.amount = portfolio.balance * this.maxPositionSizePercentage;
      checks.warnings.push(`Suggested position size: $${checks.adjustedTrade.amount.toFixed(2)}`);
    }

    // Check daily loss limit
    if (this.dailyStats.startBalance) {
      const currentLoss = Math.max(0, this.dailyStats.startBalance - portfolio.balance);
      const lossPercentage = currentLoss / this.dailyStats.startBalance;
      
      if (lossPercentage >= this.maxDailyLossPercentage) {
        checks.allowed = false;
        checks.errors.push(`Daily loss limit reached: ${(lossPercentage * 100).toFixed(2)}%`);
        
        if (this.stopTradingOnLoss) {
          this.isTradingPaused = true;
          this.pauseReason = `Daily loss limit exceeded: ${(lossPercentage * 100).toFixed(2)}%`;
        }
        return checks;
      }

      // Warn if approaching loss limit
      if (lossPercentage > this.maxDailyLossPercentage * 0.8) {
        checks.warnings.push(`Approaching daily loss limit: ${(lossPercentage * 100).toFixed(2)}%`);
      }
    }

    // Check volatility threshold
    if (marketData.volatility && marketData.volatility > this.volatilityThreshold) {
      checks.allowed = false;
      checks.errors.push(`Volatility ${(marketData.volatility * 100).toFixed(2)}% exceeds threshold ${(this.volatilityThreshold * 100).toFixed(2)}%`);
      return checks;
    } else if (marketData.volatility && marketData.volatility > this.volatilityThreshold * 0.7) {
      checks.warnings.push(`High volatility detected: ${(marketData.volatility * 100).toFixed(2)}%`);
    }

    // Check portfolio balance
    if (portfolio.balance <= 0) {
      checks.allowed = false;
      checks.errors.push('Portfolio balance is zero or negative');
      return checks;
    }

    // Check if trade amount exceeds balance
    if (trade.amount > portfolio.balance) {
      checks.allowed = false;
      checks.errors.push(`Trade amount $${trade.amount} exceeds balance $${portfolio.balance}`);
      checks.adjustedTrade.amount = portfolio.balance * 0.95; // Use 95% of balance as safety
      checks.warnings.push(`Suggested trade amount: $${checks.adjustedTrade.amount.toFixed(2)}`);
    }

    return checks;
  }

  /**
   * Record a completed trade
   * @param {Object} trade - Completed trade
   * @param {number} profitLoss - Profit or loss from the trade
   */
  recordTrade(trade, profitLoss) {
    this.dailyStats.trades++;
    
    if (profitLoss < 0) {
      this.dailyStats.loss += Math.abs(profitLoss);
    }

    // Check if we should pause trading after recording loss
    if (this.stopTradingOnLoss && this.dailyStats.startBalance) {
      const lossPercentage = this.dailyStats.loss / this.dailyStats.startBalance;
      if (lossPercentage >= this.maxDailyLossPercentage) {
        this.isTradingPaused = true;
        this.pauseReason = `Daily loss limit exceeded: ${(lossPercentage * 100).toFixed(2)}%`;
      }
    }
  }

  /**
   * Update portfolio balance for loss tracking
   * @param {number} balance - Current portfolio balance
   */
  updateBalance(balance) {
    if (!this.dailyStats.startBalance) {
      this.dailyStats.startBalance = balance;
    }
  }

  /**
   * Get current safety status
   * @returns {Object} Safety status
   */
  getStatus() {
    return {
      isTradingPaused: this.isTradingPaused,
      pauseReason: this.pauseReason,
      dailyStats: { ...this.dailyStats },
      limits: {
        maxDailyTrades: this.maxDailyTrades,
        maxDailyLossPercentage: this.maxDailyLossPercentage,
        maxPositionSizePercentage: this.maxPositionSizePercentage,
        volatilityThreshold: this.volatilityThreshold
      }
    };
  }

  /**
   * Manually pause trading
   * @param {string} reason - Reason for pausing
   */
  pauseTrading(reason = 'Manual pause') {
    this.isTradingPaused = true;
    this.pauseReason = reason;
  }

  /**
   * Resume trading
   */
  resumeTrading() {
    this.isTradingPaused = false;
    this.pauseReason = null;
  }

  /**
   * Auto-rebalance allocations based on current performance
   * @param {Object} allocations - Current strategy allocations
   * @param {Object} performance - Performance metrics for each strategy
   * @returns {Object} Rebalanced allocations
   */
  autoRebalanceAllocations(allocations, performance) {
    const rebalanced = { ...allocations };
    
    // TODO: Implement rebalancing logic based on performance
    // For now, return original allocations
    // Future: Reduce allocation to underperforming strategies, increase to outperforming ones
    
    return rebalanced;
  }
}

// Export singleton instance and class
const defaultSafetyEngine = new SafetyEngine();

module.exports = {
  SafetyEngine,
  runSafetyChecks: (trade, portfolio, marketData) => {
    return defaultSafetyEngine.runSafetyChecks(trade, portfolio, marketData);
  },
  getSafetyStatus: () => defaultSafetyEngine.getStatus(),
  recordTrade: (trade, profitLoss) => defaultSafetyEngine.recordTrade(trade, profitLoss),
  updateBalance: (balance) => defaultSafetyEngine.updateBalance(balance),
  pauseTrading: (reason) => defaultSafetyEngine.pauseTrading(reason),
  resumeTrading: () => defaultSafetyEngine.resumeTrading(),
  autoRebalanceAllocations: (allocations, performance) => 
    defaultSafetyEngine.autoRebalanceAllocations(allocations, performance)
};

