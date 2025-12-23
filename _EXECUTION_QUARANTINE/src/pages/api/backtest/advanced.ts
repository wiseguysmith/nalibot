import { NextApiRequest, NextApiResponse } from 'next';
import { advancedBacktestingEngine } from '../../../services/advancedBacktestingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      symbol = 'BTC/USD',
      startDate,
      endDate,
      initialCapital = 1000,
      slippage = 0.001,
      latency = 500,
      commission = 0.001,
      riskPerTrade = 0.02,
      maxDailyLoss = 0.05,
      maxDrawdown = 0.10,
      enableMarketRegimeDetection = true,
      enableDynamicPositionSizing = true,
      enableTrailingStop = true,
      strategyType,
      strategyParameters = {}
    } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid dates provided' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Create backtest configuration
    const config = {
      symbol,
      startDate: start,
      endDate: end,
      initialCapital,
      slippage,
      latency,
      commission,
      riskPerTrade,
      maxDailyLoss,
      maxDrawdown,
      enableMarketRegimeDetection,
      enableDynamicPositionSizing,
      enableTrailingStop
    };

    // Create strategy configuration
    const strategy = {
      name: strategyType || 'Mean Reversion',
      type: strategyType || 'mean-reversion',
      parameters: strategyParameters,
      riskParams: {
        stopLoss: 0.02,
        takeProfit: 0.04,
        maxPositionSize: 0.1,
        minVolatility: 0.01,
        maxVolatility: 0.1
      }
    };

    console.log(`🚀 Starting advanced backtest for ${strategy.name}`);
    console.log(`📊 Config: ${symbol}, ${startDate} to ${endDate}, $${initialCapital} capital`);

    // Run backtest
    const result = await advancedBacktestingEngine.runBacktest(config, strategy);

    // Format response for frontend
    const response = {
      success: true,
      data: {
        config,
        strategy,
        result: {
          trades: result.trades.length,
          performance: result.performance,
          riskMetrics: result.riskMetrics,
          marketRegimeStats: result.marketRegimeStats,
          executionAnalysis: result.executionAnalysis
        },
        summary: {
          totalReturn: `${(result.performance.totalReturn * 100).toFixed(2)}%`,
          sharpeRatio: result.performance.sharpeRatio.toFixed(2),
          maxDrawdown: `${(result.performance.maxDrawdown * 100).toFixed(2)}%`,
          winRate: `${(result.performance.winRate * 100).toFixed(1)}%`,
          profitFactor: result.performance.profitFactor.toFixed(2),
          totalTrades: result.performance.totalTrades,
          avgTradeReturn: `${(result.performance.avgTradeReturn * 100).toFixed(2)}%`,
          exposure: `${(result.performance.exposure * 100).toFixed(1)}%`
        },
        riskAssessment: {
          riskLevel: getRiskLevel(result.performance.maxDrawdown),
          recommendation: getRecommendation(result.performance),
          warnings: getWarnings(result.performance, result.riskMetrics)
        }
      }
    };

    console.log(`✅ Advanced backtest completed: ${response.data.summary.totalReturn} return`);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Advanced backtest error:', error);
    res.status(500).json({ 
      error: 'Backtest failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Helper methods for risk assessment
function getRiskLevel(maxDrawdown: number): string {
  if (maxDrawdown < 0.05) return 'Low';
  if (maxDrawdown < 0.10) return 'Moderate';
  if (maxDrawdown < 0.15) return 'High';
  return 'Very High';
}

function getRecommendation(performance: any): string {
  const { sharpeRatio, winRate, profitFactor, maxDrawdown } = performance;
  
  if (sharpeRatio > 1.5 && winRate > 0.6 && profitFactor > 1.5 && maxDrawdown < 0.1) {
    return 'Excellent - Strategy shows strong risk-adjusted returns with good consistency';
  } else if (sharpeRatio > 1.0 && winRate > 0.5 && profitFactor > 1.2) {
    return 'Good - Strategy is profitable but consider risk management improvements';
  } else if (sharpeRatio > 0.5 && winRate > 0.4) {
    return 'Fair - Strategy needs optimization for better risk-adjusted returns';
  } else {
    return 'Poor - Strategy requires significant improvements before live trading';
  }
}

function getWarnings(performance: any, riskMetrics: any): string[] {
  const warnings = [];
  
  if (performance.maxDrawdown > 0.15) {
    warnings.push('High maximum drawdown - consider reducing position sizes');
  }
  
  if (performance.sharpeRatio < 1.0) {
    warnings.push('Low Sharpe ratio - risk-adjusted returns need improvement');
  }
  
  if (performance.winRate < 0.4) {
    warnings.push('Low win rate - strategy may need better entry/exit criteria');
  }
  
  if (performance.profitFactor < 1.2) {
    warnings.push('Low profit factor - losses are too close to profits');
  }
  
  if (performance.exposure > 0.8) {
    warnings.push('High market exposure - consider reducing time in market');
  }
  
  return warnings;
} 