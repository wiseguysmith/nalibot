/**
 * Trade Explanation Layer
 * Provides human-readable explanations for trades
 * Includes strategy logic, risk management, and learning notes
 */

/**
 * Explain a trade in simple English
 * @param {Object} trade - Trade object
 * @param {string} strategyName - Name of the strategy that generated the trade
 * @param {Object} marketData - Market data used for the trade
 * @returns {Object} Trade explanation
 */
function explainTrade(trade, strategyName, marketData = {}) {
  const explanation = {
    strategyExplanation: '',
    whyThisTrade: '',
    riskManagement: '',
    technicalDetails: '',
    learningNote: ''
  };

  // Strategy explanation
  const strategyDescriptions = {
    conservative: 'The Conservative strategy focuses on capital preservation through price reversion and low-risk arbitrage opportunities.',
    balanced: 'The Balanced strategy uses a diversified mix of strategies to achieve steady growth with controlled risk.',
    aggressive: 'The Aggressive strategy seeks high returns through ML-driven predictions and breakout systems.',
    income: 'The Income strategy generates consistent returns through high-frequency arbitrage and grid trading.',
    momentum: 'The Momentum strategy rides strong trends and exits when momentum shows signs of exhaustion.',
    seasonal: 'The Seasonal strategy optimizes trading around crypto market cycles and event catalysts.',
    defensive: 'The Defensive strategy prioritizes capital preservation, sitting in cash during high volatility.',
    scalping: 'The Scalping strategy executes many small rapid trades focusing on micro-profits.'
  };

  explanation.strategyExplanation = strategyDescriptions[strategyName] || 
    `The ${strategyName} strategy generated this trade based on its core logic.`;

  // Why this trade
  const action = trade.action || trade.type || 'buy';
  const pair = trade.pair || trade.symbol || 'Unknown';
  const amount = trade.amount || 0;
  const price = trade.price || 0;
  const confidence = trade.confidence || 0;

  explanation.whyThisTrade = `We're executing a ${action.toUpperCase()} order for ${pair} ` +
    `at $${price.toFixed(2)} with a position size of $${amount.toFixed(2)}. ` +
    `The ${strategyName} strategy identified this opportunity with ${(confidence * 100).toFixed(1)}% confidence.`;

  // Add specific reasons based on strategy details
  if (trade.details) {
    const reasons = [];
    
    if (trade.details.meanReversion) {
      reasons.push(`Mean reversion signal: ${trade.details.meanReversion.reason}`);
    }
    if (trade.details.arbitrage) {
      reasons.push(`Arbitrage opportunity: ${trade.details.arbitrage.reason}`);
    }
    if (trade.details.gridTrading) {
      reasons.push(`Grid trading signal: ${trade.details.gridTrading.reason}`);
    }
    if (trade.details.mlPrediction) {
      reasons.push(`ML prediction: ${trade.details.mlPrediction.reason}`);
    }
    if (trade.details.momentum) {
      reasons.push(`Momentum signal: ${trade.details.momentum.reason}`);
    }
    if (trade.details.seasonal) {
      reasons.push(`Seasonal factor: ${trade.details.seasonal.reason}`);
    }
    if (trade.details.breakout) {
      reasons.push(`Breakout detected: ${trade.details.breakout.reason}`);
    }

    if (reasons.length > 0) {
      explanation.whyThisTrade += ' ' + reasons.join(' ');
    }
  }

  // Risk management
  const stopLoss = trade.stopLoss || trade.stopLossPercent || 0;
  const takeProfit = trade.takeProfit || trade.takeProfitPercent || 0;
  const positionSize = trade.positionSize || (amount / (marketData.balance || 1));

  explanation.riskManagement = `Risk management for this trade includes: ` +
    `Position size of ${(positionSize * 100).toFixed(1)}% of portfolio, ` +
    `stop-loss set at ${(stopLoss * 100).toFixed(1)}% below entry price, ` +
    `and take-profit target at ${(takeProfit * 100).toFixed(1)}% above entry price. ` +
    `This ensures we limit potential losses while capturing profit opportunities.`;

  // Technical details
  const technicalDetails = [];
  
  if (marketData.rsi) {
    technicalDetails.push(`RSI: ${marketData.rsi.toFixed(1)}`);
  }
  if (marketData.price) {
    technicalDetails.push(`Price: $${marketData.price.toFixed(2)}`);
  }
  if (marketData.volatility) {
    technicalDetails.push(`Volatility: ${(marketData.volatility * 100).toFixed(2)}%`);
  }
  if (marketData.volume) {
    technicalDetails.push(`Volume: ${marketData.volume.toLocaleString()}`);
  }
  if (marketData.macd) {
    technicalDetails.push(`MACD: ${marketData.macd.toFixed(4)}`);
  }

  explanation.technicalDetails = technicalDetails.length > 0
    ? `Technical indicators: ${technicalDetails.join(', ')}`
    : 'Technical analysis was used to identify this trading opportunity.';

  // Learning note
  const learningNotes = {
    conservative: 'This conservative trade prioritizes capital preservation. Small position sizes and tight risk controls help protect your portfolio.',
    balanced: 'This balanced trade uses multiple signals to reduce risk while maintaining growth potential.',
    aggressive: 'This aggressive trade seeks higher returns but carries more risk. Monitor closely and be prepared for volatility.',
    income: 'This income trade focuses on quick profits. It\'s designed to generate consistent returns through frequent small wins.',
    momentum: 'This momentum trade rides the current trend. Exit when momentum shows signs of exhaustion.',
    seasonal: 'This seasonal trade takes advantage of market cycles. Historical patterns suggest favorable conditions.',
    defensive: 'This defensive trade prioritizes safety. It only executes when risk is minimal.',
    scalping: 'This scalping trade aims for quick profits. It will be closed before market close to avoid overnight risk.'
  };

  explanation.learningNote = learningNotes[strategyName] || 
    `This trade follows the ${strategyName} strategy's approach to market opportunities.`;

  // Add profit/loss summary if trade is closed
  if (trade.status === 'closed' && trade.profit !== undefined) {
    const profitLoss = trade.profit >= 0 ? 'profit' : 'loss';
    explanation.learningNote += ` This trade resulted in a ${profitLoss} of $${Math.abs(trade.profit).toFixed(2)}.`;
  }

  return explanation;
}

/**
 * Generate a summary explanation for multiple trades
 * @param {Array} trades - Array of trade objects
 * @param {string} strategyName - Strategy name
 * @returns {string} Summary explanation
 */
function explainTradeSummary(trades, strategyName) {
  if (trades.length === 0) {
    return `No trades executed by the ${strategyName} strategy.`;
  }

  const totalTrades = trades.length;
  const profitableTrades = trades.filter(t => t.profit > 0).length;
  const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winRate = (profitableTrades / totalTrades * 100).toFixed(1);

  return `The ${strategyName} strategy executed ${totalTrades} trades with a win rate of ${winRate}%. ` +
    `Total ${totalProfit >= 0 ? 'profit' : 'loss'}: $${Math.abs(totalProfit).toFixed(2)}.`;
}

module.exports = {
  explainTrade,
  explainTradeSummary
};

