import React from 'react';

interface TradeExplanationProps {
  trade: {
    id: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    amount: number;
    price: number;
    timestamp: Date;
    strategy: string;
    reason: string;
    profit?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function TradeExplanation({ trade, isExpanded = false, onToggle }: TradeExplanationProps) {
  const [explanation, setExplanation] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isExpanded && trade) {
      setIsLoading(true);
      fetch('/api/trades/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade,
          strategyName: trade.strategy.toLowerCase().replace(/\s+/g, ''),
          marketData: {}
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setExplanation(data.explanation);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch explanation:', err);
          setIsLoading(false);
        });
    }
  }, [isExpanded, trade]);

  const getStrategyExplanation = (strategy: string, reason: string) => {
    const explanations: { [key: string]: string } = {
      'Mean Reversion': 'This strategy buys when prices are unusually low and sells when they\'re unusually high, expecting them to return to normal levels.',
      'Arbitrage': 'This strategy exploits price differences between exchanges or trading pairs to make risk-free profits.',
      'Grid Trading': 'This strategy places buy and sell orders at regular price intervals, automatically profiting from price movements.',
      'ML Prediction': 'Our AI model predicted this price movement based on historical patterns and market conditions.',
      'Trend Following': 'This strategy follows the current market trend, buying when prices are rising and selling when they\'re falling.'
    };

    return explanations[strategy] || 'This trade was executed based on our automated trading strategy.';
  };

  const getReasonExplanation = (reason: string) => {
    // Parse technical reasons into plain English
    const explanations: { [key: string]: string } = {
      'RSI oversold': 'The price had fallen too much and was likely to bounce back',
      'RSI overbought': 'The price had risen too much and was likely to fall back',
      'Price below lower BB': 'The price dropped below its normal range and was expected to recover',
      'Price above upper BB': 'The price rose above its normal range and was expected to fall back',
      'Bullish EMA crossover': 'The short-term trend turned positive, indicating upward momentum',
      'Bearish EMA crossover': 'The short-term trend turned negative, indicating downward momentum',
      'Volume spike': 'Unusually high trading activity suggested a significant price move',
      'Support level': 'The price reached a level where it typically finds buyers',
      'Resistance level': 'The price reached a level where it typically finds sellers',
      'Arbitrage opportunity': 'Found a price difference between exchanges that could be exploited',
      'Grid level reached': 'A predetermined price level was reached for automated trading',
      'ML signal': 'Our artificial intelligence detected a profitable trading opportunity'
    };

    // Try to match parts of the reason
    for (const [key, explanation] of Object.entries(explanations)) {
      if (reason.toLowerCase().includes(key.toLowerCase())) {
        return explanation;
      }
    }

    return reason; // Return original if no match found
  };

  const getOutcomeExplanation = (profit?: number) => {
    if (profit === undefined) return 'Trade is still open';
    if (profit > 0) return `This trade made a profit of $${profit.toFixed(2)}`;
    if (profit < 0) return `This trade resulted in a loss of $${Math.abs(profit).toFixed(2)}`;
    return 'This trade broke even (no profit or loss)';
  };

  const getRiskExplanation = (stopLoss?: number, takeProfit?: number) => {
    if (!stopLoss && !takeProfit) return 'No specific risk management levels set';
    
    let explanation = 'Risk management: ';
    if (stopLoss) {
      explanation += `Stop loss at $${stopLoss.toFixed(2)} (limits potential loss)`;
    }
    if (takeProfit) {
      if (stopLoss) explanation += ', ';
      explanation += `Take profit at $${takeProfit.toFixed(2)} (secures potential gains)`;
    }
    
    return explanation;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 overflow-hidden">
      {/* Trade Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              trade.type === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <span className={`text-lg ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                {trade.type === 'BUY' ? '↗' : '↘'}
              </span>
            </div>
            <div>
              <div className="text-white font-medium">{trade.symbol}</div>
              <div className="text-gray-400 text-sm">{trade.strategy}</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-white font-medium">${trade.amount}</div>
            <div className="text-gray-400 text-sm">${trade.price}</div>
            {trade.profit !== undefined && (
              <div className={`text-sm font-medium ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Explanation */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="text-gray-400">Loading explanation...</div>
            </div>
          ) : explanation ? (
            <>
              {/* Strategy Explanation */}
              <div>
                <h4 className="text-white font-medium mb-2">🤖 Strategy Explanation</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {explanation.strategyExplanation || getStrategyExplanation(trade.strategy, trade.reason)}
                </p>
              </div>

              {/* Why This Trade */}
              <div>
                <h4 className="text-white font-medium mb-2">🎯 Why This Trade?</h4>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {explanation.whyThisTrade || getReasonExplanation(trade.reason)}
                  </p>
                </div>
              </div>

              {/* Risk Management */}
              <div>
                <h4 className="text-white font-medium mb-2">🛡️ Risk Management</h4>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {explanation.riskManagement || getRiskExplanation(trade.stopLoss, trade.takeProfit)}
                  </p>
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h4 className="text-white font-medium mb-2">🔧 Technical Details</h4>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {explanation.technicalDetails || 'Technical analysis was used to identify this trading opportunity.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-gray-400">Trade ID:</span>
                    <span className="text-white ml-2">{trade.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Time:</span>
                    <span className="text-white ml-2">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white ml-2">${trade.amount}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Price:</span>
                    <span className="text-white ml-2">${trade.price}</span>
                  </div>
                </div>
              </div>

              {/* Learning Note */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 text-lg">💡</span>
                  <div>
                    <h5 className="text-blue-400 font-medium text-sm">Learning Note</h5>
                    <p className="text-blue-300 text-sm mt-1">
                      {explanation.learningNote || (
                        trade.profit && trade.profit > 0 
                          ? 'This trade was successful! Our strategy correctly identified a profitable opportunity.'
                          : trade.profit && trade.profit < 0
                          ? 'This trade didn\'t go as planned, but it\'s part of our risk management strategy. We learn from every trade to improve future performance.'
                          : 'This trade is still active. We\'ll monitor it closely and adjust if needed.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Fallback to original explanation */}
              <div>
                <h4 className="text-white font-medium mb-2">🤖 Strategy Explanation</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {getStrategyExplanation(trade.strategy, trade.reason)}
                </p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">🎯 Why This Trade?</h4>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {getReasonExplanation(trade.reason)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 