import { NextApiRequest, NextApiResponse } from 'next';
import { dailyDigestService, DailyDigestData } from '../../../services/dailyDigestService';
import { liveTradingEngine } from '../../../services/liveTradingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail, digestData } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // If no digest data provided, generate from live trading engine
    let finalDigestData: DailyDigestData;
    
    if (digestData) {
      finalDigestData = digestData;
    } else {
      // Generate digest data from live trading engine
      const performance = liveTradingEngine.getPerformance();
      const strategies = liveTradingEngine.getStrategyPerformance();
      const recentTrades = liveTradingEngine.getRecentTrades(10);
      
      // Find top performing strategy
      const topStrategy = strategies.reduce((prev, current) => 
        (current.totalPnL > prev.totalPnL) ? current : prev
      );

      finalDigestData = {
        date: new Date().toLocaleDateString(),
        totalBalance: performance.totalBalance,
        dailyPnL: performance.dailyPnL,
        totalPnL: performance.totalPnL,
        winRate: performance.winRate,
        totalTrades: performance.totalTrades,
        maxDrawdown: performance.maxDrawdown,
        sharpeRatio: performance.sharpeRatio,
        topPerformingStrategy: {
          name: topStrategy.name,
          pnl: topStrategy.totalPnL,
          winRate: topStrategy.winRate
        },
        recentTrades: recentTrades.map(trade => ({
          symbol: trade.pair,
          type: trade.type,
          amount: trade.amount,
          price: trade.price,
          profit: trade.profit,
          strategy: trade.strategy,
          timestamp: trade.timestamp
        })),
        marketSummary: {
          btcChange: Math.random() * 10 - 5, // Simulated market data
          ethChange: Math.random() * 8 - 4,
          marketSentiment: Math.random() > 0.5 ? 'bullish' : 'bearish'
        },
        riskMetrics: {
          currentRisk: 45, // This should come from risk manager
          riskLevel: 'medium',
          dailyLoss: Math.abs(performance.dailyPnL < 0 ? performance.dailyPnL : 0),
          maxDailyLoss: 50.00
        },
        insights: [
          `${topStrategy.name} strategy performed well today`,
          'Market conditions are favorable for mean reversion strategies',
          'Consider increasing position sizes in trending markets',
          'Grid trading opportunities detected in major pairs'
        ],
        nextDayOutlook: 'Expect continued market volatility with opportunities for both trend following and mean reversion strategies. Monitor BTC support levels.'
      };
    }

    // Send the digest email
    const success = await dailyDigestService.sendDailyDigest(userEmail, finalDigestData);

    if (success) {
      res.status(200).json({ 
        success: true, 
        message: 'Daily digest sent successfully',
        digestData: finalDigestData
      });
    } else {
      res.status(500).json({ error: 'Failed to send daily digest' });
    }

  } catch (error) {
    console.error('Daily digest API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 