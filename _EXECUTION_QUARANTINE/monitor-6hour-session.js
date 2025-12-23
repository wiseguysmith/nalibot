#!/usr/bin/env node

const fetch = require('node-fetch');

console.log('🚀 AutoBread 6-Hour Trading Session Monitor');
console.log('============================================');
console.log('⏰ Session Start:', new Date().toLocaleString());
console.log('⏰ Session End:', new Date(Date.now() + 6 * 60 * 60 * 1000).toLocaleString());
console.log('');

const baseUrl = 'http://localhost:3000';
let sessionStartTime = Date.now();
let initialBalance = 0;
let maxBalance = 0;
let minBalance = 0;
let tradeCount = 0;
let winCount = 0;
let totalPnL = 0;
let maxDrawdown = 0;
let riskAlerts = [];

async function monitorSession() {
  try {
    // Get initial performance
    const response = await fetch(`${baseUrl}/api/trading/performance`);
    if (response.ok) {
      const data = await response.json();
      initialBalance = data.data.performance.totalBalance;
      maxBalance = initialBalance;
      minBalance = initialBalance;
      
      console.log('✅ Bot Status: ACTIVE');
      console.log(`💰 Initial Balance: $${initialBalance.toFixed(2)}`);
      console.log('🛡️  Risk Controls: ENABLED');
      console.log('   • Max 2% loss per trade');
      console.log('   • Max 5% daily loss');
      console.log('   • Max 10% portfolio drawdown');
      console.log('   • Dynamic position sizing');
      console.log('   • Market regime detection');
      console.log('');
    }
  } catch (error) {
    console.log('❌ Could not connect to bot. Make sure it\'s running on http://localhost:3000');
    return;
  }

  // Monitor every 5 minutes
  const monitorInterval = setInterval(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/trading/performance`);
      if (response.ok) {
        const data = await response.json();
        const performance = data.data.performance;
        const strategies = data.data.strategies;
        const recentTrades = data.data.recentTrades;
        
        // Update session stats
        const currentBalance = performance.totalBalance;
        maxBalance = Math.max(maxBalance, currentBalance);
        minBalance = Math.min(minBalance, currentBalance);
        
        const sessionPnL = ((currentBalance - initialBalance) / initialBalance) * 100;
        const currentDrawdown = ((maxBalance - currentBalance) / maxBalance) * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
        
        // Count new trades
        const newTrades = recentTrades.filter(trade => 
          new Date(trade.timestamp).getTime() > sessionStartTime
        );
        tradeCount += newTrades.length;
        
        // Count wins
        newTrades.forEach(trade => {
          if (trade.profit && trade.profit > 0) winCount++;
          totalPnL += trade.profit || 0;
        });
        
        const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
        const avgTradePnL = tradeCount > 0 ? totalPnL / tradeCount : 0;
        
        // Clear console and show updated status
        console.clear();
        console.log('🚀 AutoBread 6-Hour Trading Session Monitor');
        console.log('============================================');
        console.log(`⏰ Session Time: ${((Date.now() - sessionStartTime) / (1000 * 60)).toFixed(0)} minutes`);
        console.log(`⏰ Remaining: ${((6 * 60 * 60 * 1000 - (Date.now() - sessionStartTime)) / (1000 * 60)).toFixed(0)} minutes`);
        console.log('');
        
        // Performance Summary
        console.log('📊 SESSION PERFORMANCE');
        console.log('----------------------');
        console.log(`💰 Current Balance: $${currentBalance.toFixed(2)}`);
        console.log(`📈 Session P&L: ${sessionPnL >= 0 ? '+' : ''}${sessionPnL.toFixed(2)}%`);
        console.log(`📉 Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
        console.log(`🔄 Total Trades: ${tradeCount}`);
        console.log(`🎯 Win Rate: ${winRate.toFixed(1)}%`);
        console.log(`💰 Avg Trade P&L: ${avgTradePnL >= 0 ? '+' : ''}${avgTradePnL.toFixed(2)}`);
        console.log('');
        
        // Risk Assessment
        console.log('🛡️  RISK ASSESSMENT');
        console.log('-------------------');
        const riskLevel = currentDrawdown < 5 ? '🟢 LOW' : 
                         currentDrawdown < 10 ? '🟡 MODERATE' : 
                         currentDrawdown < 15 ? '🟠 HIGH' : '🔴 VERY HIGH';
        console.log(`Risk Level: ${riskLevel}`);
        console.log(`Current Drawdown: ${currentDrawdown.toFixed(2)}%`);
        console.log(`Daily P&L: ${performance.dailyPnL >= 0 ? '+' : ''}${performance.dailyPnL.toFixed(2)}%`);
        console.log(`Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}`);
        console.log('');
        
        // Strategy Performance
        console.log('📈 STRATEGY PERFORMANCE');
        console.log('------------------------');
        strategies.forEach(strategy => {
          const pnlColor = strategy.totalPnL >= 0 ? '\x1b[32m' : '\x1b[31m';
          const resetColor = '\x1b[0m';
          console.log(`${strategy.name}: ${pnlColor}${strategy.totalPnL >= 0 ? '+' : ''}${strategy.totalPnL.toFixed(2)}%${resetColor} (${strategy.winRate.toFixed(1)}% win rate)`);
        });
        console.log('');
        
        // Recent Trades
        console.log('🔄 RECENT TRADES (Last 5)');
        console.log('-------------------------');
        recentTrades.slice(0, 5).forEach(trade => {
          const time = new Date(trade.timestamp).toLocaleTimeString();
          const pnlColor = trade.profit && trade.profit > 0 ? '\x1b[32m' : '\x1b[31m';
          const resetColor = '\x1b[0m';
          console.log(`${time} ${trade.pair} ${trade.type} $${trade.amount.toFixed(2)} ${pnlColor}${trade.profit ? (trade.profit >= 0 ? '+' : '') + trade.profit.toFixed(2) : '-'}${resetColor}`);
        });
        console.log('');
        
        // Risk Alerts
        if (currentDrawdown > 8) {
          const alert = `⚠️  HIGH DRAWDOWN ALERT: ${currentDrawdown.toFixed(2)}%`;
          if (!riskAlerts.includes(alert)) {
            riskAlerts.push(alert);
            console.log(alert);
          }
        }
        
        if (performance.dailyPnL < -4) {
          const alert = `⚠️  DAILY LOSS ALERT: ${performance.dailyPnL.toFixed(2)}%`;
          if (!riskAlerts.includes(alert)) {
            riskAlerts.push(alert);
            console.log(alert);
          }
        }
        
        if (riskAlerts.length > 0) {
          console.log('🚨 ACTIVE ALERTS:');
          riskAlerts.forEach(alert => console.log(alert));
          console.log('');
        }
        
        // Session End Check
        const sessionElapsed = Date.now() - sessionStartTime;
        if (sessionElapsed >= 6 * 60 * 60 * 1000) {
          console.log('🎉 SESSION COMPLETE!');
          console.log('===================');
          console.log(`💰 Final Balance: $${currentBalance.toFixed(2)}`);
          console.log(`📈 Total Session P&L: ${sessionPnL >= 0 ? '+' : ''}${sessionPnL.toFixed(2)}%`);
          console.log(`📉 Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
          console.log(`🔄 Total Trades: ${tradeCount}`);
          console.log(`🎯 Final Win Rate: ${winRate.toFixed(1)}%`);
          console.log(`💰 Avg Trade P&L: ${avgTradePnL >= 0 ? '+' : ''}${avgTradePnL.toFixed(2)}`);
          console.log('');
          console.log('✅ Session monitoring complete. Bot will continue running.');
          clearInterval(monitorInterval);
        }
        
      } else {
        console.log('❌ Could not fetch performance data');
      }
    } catch (error) {
      console.log('❌ Monitoring error:', error.message);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

// Start monitoring
monitorSession();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Monitoring stopped by user');
  console.log('✅ Bot continues running in background');
  process.exit(0);
}); 