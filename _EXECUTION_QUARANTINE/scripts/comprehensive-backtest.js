const { BacktestingEngine } = require('../src/services/backtestingEngine');
const { strategies } = require('../src/utils/strategies');

async function runComprehensiveBacktest() {
  console.log('🧪 Starting Comprehensive Backtesting...');
  console.log('==========================================');

  const engine = new BacktestingEngine();
  
  // Test all strategies with different parameters
  const testConfigs = [
    { 
      strategy: 'meanReversion', 
      params: { rsiPeriod: 14, bbPeriod: 20 },
      description: 'Mean Reversion (RSI 14, BB 20)'
    },
    { 
      strategy: 'meanReversion', 
      params: { rsiPeriod: 21, bbPeriod: 30 },
      description: 'Mean Reversion (RSI 21, BB 30)'
    },
    { 
      strategy: 'arbitrage', 
      params: { minSpread: 0.005 },
      description: 'Arbitrage (0.5% min spread)'
    },
    { 
      strategy: 'arbitrage', 
      params: { minSpread: 0.01 },
      description: 'Arbitrage (1% min spread)'
    },
    { 
      strategy: 'gridTrading', 
      params: { gridLevels: 10, gridSpacing: 0.02 },
      description: 'Grid Trading (10 levels, 2% spacing)'
    },
    { 
      strategy: 'gridTrading', 
      params: { gridLevels: 20, gridSpacing: 0.01 },
      description: 'Grid Trading (20 levels, 1% spacing)'
    },
    { 
      strategy: 'trendFollowing', 
      params: { emaShort: 12, emaLong: 26 },
      description: 'Trend Following (EMA 12/26)'
    },
    { 
      strategy: 'trendFollowing', 
      params: { emaShort: 9, emaLong: 21 },
      description: 'Trend Following (EMA 9/21)'
    }
  ];
  
  const results = [];
  
  for (const config of testConfigs) {
    console.log(`\n📊 Testing: ${config.description}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await engine.runBacktest({
        strategy: config.strategy,
        params: config.params,
        startDate: '2024-01-01',
        endDate: '2024-12-01',
        initialBalance: 1000,
        pairs: ['BTC/USD', 'ETH/USD', 'SOL/USD']
      });
      
      const summary = {
        strategy: config.strategy,
        description: config.description,
        params: config.params,
        totalReturn: result.totalReturn,
        sharpeRatio: result.sharpeRatio,
        maxDrawdown: result.maxDrawdown,
        winRate: result.winRate,
        profitFactor: result.profitFactor,
        totalTrades: result.totalTrades,
        avgTradeDuration: result.avgTradeDuration
      };
      
      results.push(summary);
      
      console.log(`✅ Total Return: ${(result.totalReturn * 100).toFixed(2)}%`);
      console.log(`📈 Sharpe Ratio: ${result.sharpeRatio.toFixed(3)}`);
      console.log(`📉 Max Drawdown: ${(result.maxDrawdown * 100).toFixed(2)}%`);
      console.log(`🎯 Win Rate: ${(result.winRate * 100).toFixed(1)}%`);
      console.log(`💰 Profit Factor: ${result.profitFactor.toFixed(2)}`);
      console.log(`🔄 Total Trades: ${result.totalTrades}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${config.description}:`, error.message);
      results.push({
        strategy: config.strategy,
        description: config.description,
        params: config.params,
        error: error.message
      });
    }
  }
  
  // Analyze results
  console.log('\n🎯 ANALYSIS RESULTS');
  console.log('===================');
  
  const validResults = results.filter(r => !r.error);
  
  if (validResults.length === 0) {
    console.log('❌ No valid results to analyze');
    return results;
  }
  
  // Find best performing strategy by Sharpe ratio
  const bestBySharpe = validResults.reduce((best, current) => 
    current.sharpeRatio > best.sharpeRatio ? current : best
  );
  
  // Find best performing strategy by total return
  const bestByReturn = validResults.reduce((best, current) => 
    current.totalReturn > best.totalReturn ? current : best
  );
  
  // Find best performing strategy by win rate
  const bestByWinRate = validResults.reduce((best, current) => 
    current.winRate > best.winRate ? current : best
  );
  
  // Find lowest drawdown strategy
  const lowestDrawdown = validResults.reduce((best, current) => 
    current.maxDrawdown < best.maxDrawdown ? current : best
  );
  
  console.log('\n🏆 BEST PERFORMING STRATEGIES:');
  console.log('─'.repeat(40));
  console.log(`📈 Best Sharpe Ratio: ${bestBySharpe.description}`);
  console.log(`   Sharpe: ${bestBySharpe.sharpeRatio.toFixed(3)}, Return: ${(bestBySharpe.totalReturn * 100).toFixed(2)}%`);
  
  console.log(`💰 Best Total Return: ${bestByReturn.description}`);
  console.log(`   Return: ${(bestByReturn.totalReturn * 100).toFixed(2)}%, Sharpe: ${bestByReturn.sharpeRatio.toFixed(3)}`);
  
  console.log(`🎯 Best Win Rate: ${bestByWinRate.description}`);
  console.log(`   Win Rate: ${(bestByWinRate.winRate * 100).toFixed(1)}%, Return: ${(bestByWinRate.totalReturn * 100).toFixed(2)}%`);
  
  console.log(`🛡️ Lowest Drawdown: ${lowestDrawdown.description}`);
  console.log(`   Drawdown: ${(lowestDrawdown.maxDrawdown * 100).toFixed(2)}%, Return: ${(lowestDrawdown.totalReturn * 100).toFixed(2)}%`);
  
  // Calculate averages
  const avgReturn = validResults.reduce((sum, r) => sum + r.totalReturn, 0) / validResults.length;
  const avgSharpe = validResults.reduce((sum, r) => sum + r.sharpeRatio, 0) / validResults.length;
  const avgWinRate = validResults.reduce((sum, r) => sum + r.winRate, 0) / validResults.length;
  const avgDrawdown = validResults.reduce((sum, r) => sum + r.maxDrawdown, 0) / validResults.length;
  
  console.log('\n📊 AVERAGE PERFORMANCE:');
  console.log('─'.repeat(30));
  console.log(`📈 Average Return: ${(avgReturn * 100).toFixed(2)}%`);
  console.log(`📊 Average Sharpe: ${avgSharpe.toFixed(3)}`);
  console.log(`🎯 Average Win Rate: ${(avgWinRate * 100).toFixed(1)}%`);
  console.log(`📉 Average Drawdown: ${(avgDrawdown * 100).toFixed(2)}%`);
  
  // Strategy type analysis
  const strategyTypes = {};
  validResults.forEach(result => {
    if (!strategyTypes[result.strategy]) {
      strategyTypes[result.strategy] = [];
    }
    strategyTypes[result.strategy].push(result);
  });
  
  console.log('\n📋 STRATEGY TYPE ANALYSIS:');
  console.log('─'.repeat(30));
  
  Object.entries(strategyTypes).forEach(([strategy, configs]) => {
    const avgReturn = configs.reduce((sum, c) => sum + c.totalReturn, 0) / configs.length;
    const avgSharpe = configs.reduce((sum, c) => sum + c.sharpeRatio, 0) / configs.length;
    
    console.log(`${strategy}: ${(avgReturn * 100).toFixed(2)}% return, ${avgSharpe.toFixed(3)} Sharpe (${configs.length} configs)`);
  });
  
  // Risk-adjusted ranking
  console.log('\n🏅 RISK-ADJUSTED RANKING:');
  console.log('─'.repeat(30));
  
  const rankedResults = validResults
    .map(r => ({
      ...r,
      riskAdjustedScore: r.sharpeRatio * (1 - r.maxDrawdown) * r.winRate
    }))
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);
  
  rankedResults.slice(0, 5).forEach((result, index) => {
    console.log(`${index + 1}. ${result.description}`);
    console.log(`   Score: ${result.riskAdjustedScore.toFixed(3)}, Return: ${(result.totalReturn * 100).toFixed(2)}%, Sharpe: ${result.sharpeRatio.toFixed(3)}`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('─'.repeat(20));
  
  if (bestBySharpe.sharpeRatio > 1.5) {
    console.log('✅ Excellent Sharpe ratio achieved - strategy is well-optimized');
  } else if (bestBySharpe.sharpeRatio > 1.0) {
    console.log('⚠️ Good Sharpe ratio, but room for improvement');
  } else {
    console.log('❌ Low Sharpe ratio - consider strategy optimization');
  }
  
  if (bestByReturn.totalReturn > 0.5) {
    console.log('✅ Strong returns achieved - strategy shows promise');
  } else if (bestByReturn.totalReturn > 0.2) {
    console.log('⚠️ Moderate returns - consider parameter tuning');
  } else {
    console.log('❌ Low returns - strategy may need fundamental changes');
  }
  
  if (lowestDrawdown.maxDrawdown < 0.1) {
    console.log('✅ Excellent risk management - low drawdown');
  } else if (lowestDrawdown.maxDrawdown < 0.2) {
    console.log('⚠️ Acceptable risk level, but monitor closely');
  } else {
    console.log('❌ High drawdown - implement better risk controls');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('─'.repeat(15));
  console.log('1. Focus on the top 3 risk-adjusted strategies');
  console.log('2. Implement real trading with the best performing strategy');
  console.log('3. Set up proper risk management based on max drawdown');
  console.log('4. Monitor performance and adjust parameters as needed');
  
  return results;
}

// Run the backtest
if (require.main === module) {
  runComprehensiveBacktest()
    .then(results => {
      console.log('\n✅ Comprehensive backtesting completed!');
      console.log(`📊 Tested ${results.length} strategy configurations`);
    })
    .catch(error => {
      console.error('❌ Backtesting failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveBacktest }; 