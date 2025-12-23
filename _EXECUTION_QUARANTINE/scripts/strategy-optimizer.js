#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * AutoBread Strategy Optimizer CLI
 * 
 * This script runs backtests on different strategy parameters and finds the optimal configurations.
 * 
 * Usage:
 * node scripts/strategy-optimizer.js --strategy=mean-reversion --symbol=BTC/USD --days=30
 * node scripts/strategy-optimizer.js --all-strategies --symbol=BTC/USD --days=90
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value;
  }
});

// Default options
const config = {
  strategy: options.strategy || 'all',
  symbol: options.symbol || 'BTC/USD',
  days: parseInt(options.days) || 30,
  provider: options.provider || 'kraken',
  outputFile: options.output || 'strategy-optimization-results.csv'
};

console.log('🤖 AutoBread Strategy Optimizer');
console.log('================================');
console.log(`Strategy: ${config.strategy}`);
console.log(`Symbol: ${config.symbol}`);
console.log(`Period: ${config.days} days`);
console.log(`Provider: ${config.provider}`);
console.log('');

// Strategy parameter ranges
const strategyParams = {
  'mean-reversion': {
    rsiPeriod: [10, 14, 20],
    rsiOversold: [20, 25, 30],
    rsiOverbought: [70, 75, 80],
    bbPeriod: [15, 20, 25],
    bbStdDev: [1.5, 2.0, 2.5]
  },
  'trend-following': {
    shortEMA: [5, 9, 12],
    longEMA: [15, 21, 26],
    volumeEMA: [8, 10, 12],
    trendStrength: [0.5, 0.7, 0.9]
  },
  'grid-trading': {
    gridCount: [5, 10, 15],
    gridSpread: [1.0, 2.0, 3.0],
    maxPositions: [3, 5, 7]
  },
  'arbitrage': {
    minProfitPercent: [0.5, 1.0, 1.5],
    maxTradeAmount: [100, 500, 1000],
    timeoutSeconds: [30, 60, 120]
  },
  'volatility-breakout': {
    atrPeriod: [10, 14, 20],
    breakoutThreshold: [1.0, 1.5, 2.0],
    stopLossMultiplier: [1.5, 2.0, 2.5]
  }
};

// Generate parameter combinations
function generateParameterCombinations(strategy, params) {
  const combinations = [];
  const paramNames = Object.keys(params);
  const paramValues = Object.values(params);
  
  function generateCombination(index, currentParams) {
    if (index === paramNames.length) {
      combinations.push({ ...currentParams });
      return;
    }
    
    const paramName = paramNames[index];
    const values = paramValues[index];
    
    for (const value of values) {
      currentParams[paramName] = value;
      generateCombination(index + 1, currentParams);
    }
  }
  
  generateCombination(0, {});
  return combinations;
}

// Run backtest via API
async function runBacktest(strategy, params, symbol, startDate, endDate, provider) {
  try {
    const response = await fetch('http://localhost:3000/api/backtest/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        strategy: {
          name: strategy,
          parameters: params
        },
        symbol,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        provider
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`❌ Backtest failed for ${strategy}:`, error.message);
    return null;
  }
}

// Calculate optimization score
function calculateScore(result) {
  if (!result) return 0;
  
  // Weighted scoring based on multiple factors
  const sharpeWeight = 0.3;
  const returnWeight = 0.25;
  const drawdownWeight = 0.2;
  const winRateWeight = 0.15;
  const profitFactorWeight = 0.1;
  
  const sharpeScore = Math.max(0, result.sharpeRatio) / 3; // Normalize to 0-1
  const returnScore = Math.max(0, result.totalReturn) / 100; // Normalize to 0-1
  const drawdownScore = Math.max(0, 1 - (result.maxDrawdown / 50)); // Lower drawdown = higher score
  const winRateScore = result.winRate / 100; // Already 0-1
  const profitFactorScore = Math.min(1, result.profitFactor / 3); // Normalize to 0-1
  
  return (
    sharpeScore * sharpeWeight +
    returnScore * returnWeight +
    drawdownScore * drawdownWeight +
    winRateScore * winRateWeight +
    profitFactorScore * profitFactorWeight
  );
}

// Save results to CSV
function saveResultsToCSV(results, filename) {
  const headers = [
    'Strategy',
    'Parameters',
    'Total Return (%)',
    'Sharpe Ratio',
    'Max Drawdown (%)',
    'Win Rate (%)',
    'Profit Factor',
    'Total Trades',
    'Optimization Score',
    'Start Date',
    'End Date'
  ];

  const csvContent = [
    headers.join(','),
    ...results.map(result => [
      result.strategy,
      JSON.stringify(result.parameters),
      result.totalReturn?.toFixed(2) || 'N/A',
      result.sharpeRatio?.toFixed(3) || 'N/A',
      result.maxDrawdown?.toFixed(2) || 'N/A',
      result.winRate?.toFixed(1) || 'N/A',
      result.profitFactor?.toFixed(2) || 'N/A',
      result.totalTrades || 'N/A',
      result.optimizationScore?.toFixed(3) || 'N/A',
      result.startDate || 'N/A',
      result.endDate || 'N/A'
    ].join(','))
  ].join('\n');

  fs.writeFileSync(filename, csvContent);
  console.log(`📊 Results saved to ${filename}`);
}

// Main optimization function
async function optimizeStrategy() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - config.days);
  const endDate = new Date();
  
  console.log(`🕐 Optimizing strategies from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log('');

  const allResults = [];
  const strategies = config.strategy === 'all' ? Object.keys(strategyParams) : [config.strategy];

  for (const strategy of strategies) {
    if (!strategyParams[strategy]) {
      console.log(`⚠️ Strategy "${strategy}" not found, skipping...`);
      continue;
    }

    console.log(`🔍 Optimizing ${strategy} strategy...`);
    const combinations = generateParameterCombinations(strategy, strategyParams[strategy]);
    console.log(`   Testing ${combinations.length} parameter combinations...`);

    const strategyResults = [];
    let completed = 0;

    for (const params of combinations) {
      process.stdout.write(`\r   Progress: ${completed + 1}/${combinations.length} (${Math.round(((completed + 1) / combinations.length) * 100)}%)`);
      
      const result = await runBacktest(strategy, params, config.symbol, startDate, endDate, config.provider);
      
      if (result) {
        const optimizationScore = calculateScore(result);
        strategyResults.push({
          strategy,
          parameters: params,
          ...result,
          optimizationScore,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });
      }
      
      completed++;
      
      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(''); // New line after progress

    // Sort by optimization score
    strategyResults.sort((a, b) => b.optimizationScore - a.optimizationScore);

    // Show top 3 results for this strategy
    console.log(`\n🏆 Top 3 ${strategy} configurations:`);
    strategyResults.slice(0, 3).forEach((result, index) => {
      console.log(`   ${index + 1}. Score: ${result.optimizationScore.toFixed(3)} | Return: ${result.totalReturn?.toFixed(2)}% | Sharpe: ${result.sharpeRatio?.toFixed(3)} | Drawdown: ${result.maxDrawdown?.toFixed(2)}%`);
    });

    allResults.push(...strategyResults);
  }

  // Sort all results by optimization score
  allResults.sort((a, b) => b.optimizationScore - a.optimizationScore);

  // Save results
  saveResultsToCSV(allResults, config.outputFile);

  // Show overall top 3
  console.log('\n🎯 Overall Top 3 Configurations:');
  allResults.slice(0, 3).forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.strategy} | Score: ${result.optimizationScore.toFixed(3)} | Return: ${result.totalReturn?.toFixed(2)}% | Sharpe: ${result.sharpeRatio?.toFixed(3)}`);
  });

  // Save top configurations as presets
  const topConfigs = allResults.slice(0, 3).map((result, index) => ({
    name: `Optimized_${result.strategy}_${index + 1}`,
    strategy: result.strategy,
    parameters: result.parameters,
    performance: {
      totalReturn: result.totalReturn,
      sharpeRatio: result.sharpeRatio,
      maxDrawdown: result.maxDrawdown,
      winRate: result.winRate,
      profitFactor: result.profitFactor
    }
  }));

  const presetsFile = 'optimized-strategy-presets.json';
  fs.writeFileSync(presetsFile, JSON.stringify(topConfigs, null, 2));
  console.log(`💾 Top configurations saved as presets in ${presetsFile}`);

  console.log('\n✅ Strategy optimization completed!');
  console.log(`📈 Total configurations tested: ${allResults.length}`);
  console.log(`🎯 Best score: ${allResults[0]?.optimizationScore.toFixed(3)}`);
}

// Run optimization
if (require.main === module) {
  optimizeStrategy().catch(console.error);
}

module.exports = {
  optimizeStrategy,
  generateParameterCombinations,
  calculateScore
}; 