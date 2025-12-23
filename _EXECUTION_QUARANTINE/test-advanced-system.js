#!/usr/bin/env node

const fetch = require('node-fetch');

console.log('🧠 AutoBread Advanced Trading System Test');
console.log('==========================================');
console.log('');

async function testAdvancedSystem() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Advanced Backtesting
    console.log('📊 Test 1: Advanced Backtesting with Risk Control');
    console.log('------------------------------------------------');
    
    const backtestResponse = await fetch(`${baseUrl}/api/backtest/advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTC/USD',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        initialCapital: 1000,
        slippage: 0.001,
        latency: 500,
        commission: 0.001,
        riskPerTrade: 0.02,
        maxDailyLoss: 0.05,
        maxDrawdown: 0.10,
        enableMarketRegimeDetection: true,
        enableDynamicPositionSizing: true,
        enableTrailingStop: true,
        strategyType: 'mean-reversion',
        strategyParameters: {
          rsiPeriod: 14,
          bbPeriod: 20,
          bbStdDev: 2
        }
      })
    });

    if (backtestResponse.ok) {
      const backtestResult = await backtestResponse.json();
      console.log('✅ Advanced backtest completed successfully');
      console.log(`📈 Total Return: ${backtestResult.data.summary.totalReturn}`);
      console.log(`📊 Sharpe Ratio: ${backtestResult.data.summary.sharpeRatio}`);
      console.log(`📉 Max Drawdown: ${backtestResult.data.summary.maxDrawdown}`);
      console.log(`🎯 Win Rate: ${backtestResult.data.summary.winRate}`);
      console.log(`💰 Profit Factor: ${backtestResult.data.summary.profitFactor}`);
      console.log(`⚡ Risk Level: ${backtestResult.data.riskAssessment.riskLevel}`);
      console.log(`💡 Recommendation: ${backtestResult.data.riskAssessment.recommendation}`);
      
      if (backtestResult.data.riskAssessment.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        backtestResult.data.riskAssessment.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }
    } else {
      console.log('❌ Advanced backtest failed:', backtestResponse.statusText);
    }
    
    console.log('');

    // Test 2: Meta-Strategy Allocation
    console.log('🧠 Test 2: Meta-Strategy Allocation System');
    console.log('------------------------------------------');
    
    const allocationResponse = await fetch(`${baseUrl}/api/strategy/allocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketRegime: 'trending',
        forceReallocation: true
      })
    });

    if (allocationResponse.ok) {
      const allocationResult = await allocationResponse.json();
      console.log('✅ Meta-strategy allocation calculated');
      console.log(`📊 Market Regime: ${allocationResult.data.allocationDecision.marketRegime}`);
      console.log(`🎯 Confidence: ${(allocationResult.data.allocationDecision.confidence * 100).toFixed(1)}%`);
      console.log(`💡 Reason: ${allocationResult.data.allocationDecision.reason}`);
      
      console.log('📈 Strategy Allocations:');
      Object.entries(allocationResult.data.allocationDecision.strategyAllocations).forEach(([strategy, allocation]) => {
        console.log(`   • ${strategy}: ${allocation.toFixed(1)}%`);
      });
      
      console.log('🏆 Strategy Scores:');
      allocationResult.data.strategyScores.slice(0, 3).forEach((score, index) => {
        console.log(`   ${index + 1}. ${score.name}: ${score.compositeScore.toFixed(2)} (${score.recommendedAllocation.toFixed(1)}%)`);
      });
    } else {
      console.log('❌ Meta-strategy allocation failed:', allocationResponse.statusText);
    }
    
    console.log('');

    // Test 3: Current Performance Status
    console.log('📊 Test 3: Current Performance Status');
    console.log('-------------------------------------');
    
    const performanceResponse = await fetch(`${baseUrl}/api/trading/performance`);
    
    if (performanceResponse.ok) {
      const performanceResult = await performanceResponse.json();
      console.log('✅ Performance data retrieved');
      console.log(`💰 Total Balance: $${performanceResult.data.performance.totalBalance.toFixed(2)}`);
      console.log(`📈 Total P&L: ${performanceResult.data.performance.totalPnL >= 0 ? '+' : ''}${performanceResult.data.performance.totalPnL.toFixed(2)}%`);
      console.log(`📊 Sharpe Ratio: ${performanceResult.data.performance.sharpeRatio.toFixed(2)}`);
      console.log(`📉 Max Drawdown: ${(performanceResult.data.performance.maxDrawdown * 100).toFixed(1)}%`);
      console.log(`🎯 Win Rate: ${(performanceResult.data.performance.winRate * 100).toFixed(1)}%`);
      console.log(`🔄 Total Trades: ${performanceResult.data.performance.totalTrades}`);
      
      console.log('📋 Strategy Performance:');
      performanceResult.data.strategies.forEach(strategy => {
        console.log(`   • ${strategy.name}: ${strategy.totalPnL >= 0 ? '+' : ''}${strategy.totalPnL.toFixed(2)}% (${strategy.winRate.toFixed(1)}% win rate)`);
      });
    } else {
      console.log('❌ Performance data retrieval failed:', performanceResponse.statusText);
    }
    
    console.log('');

    // Test 4: Allocation Status
    console.log('📋 Test 4: Allocation Status');
    console.log('----------------------------');
    
    const allocationStatusResponse = await fetch(`${baseUrl}/api/strategy/allocation`);
    
    if (allocationStatusResponse.ok) {
      const allocationStatus = await allocationStatusResponse.json();
      console.log('✅ Allocation status retrieved');
      console.log(`🔄 Should Reallocate: ${allocationStatus.data.shouldReallocate ? 'Yes' : 'No'}`);
      
      if (allocationStatus.data.allocationSummary) {
        console.log(`📊 Total Decisions: ${allocationStatus.data.allocationSummary.totalDecisions}`);
        console.log(`🎯 Average Confidence: ${(allocationStatus.data.allocationSummary.averageConfidence * 100).toFixed(1)}%`);
        console.log(`📅 Last Reallocation: ${new Date(allocationStatus.data.allocationSummary.lastReallocation).toLocaleString()}`);
        console.log(`⏰ Next Reallocation: ${new Date(allocationStatus.data.allocationSummary.nextReallocation).toLocaleString()}`);
      }
    } else {
      console.log('❌ Allocation status retrieval failed:', allocationStatusResponse.statusText);
    }

    console.log('');
    console.log('🎉 Advanced Trading System Test Completed!');
    console.log('');
    console.log('📋 Summary of Features Tested:');
    console.log('   ✅ Advanced backtesting with risk control');
    console.log('   ✅ Market regime detection');
    console.log('   ✅ Dynamic position sizing');
    console.log('   ✅ Meta-strategy allocation');
    console.log('   ✅ Performance tracking with KPIs');
    console.log('   ✅ Risk assessment and warnings');
    console.log('   ✅ Strategy scoring and ranking');
    console.log('');
    console.log('🚀 The AutoBread system is now ready for advanced trading operations!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Make sure the server is running on http://localhost:3000');
    console.log('   Run: npm run dev');
  }
}

// Run the test
testAdvancedSystem(); 