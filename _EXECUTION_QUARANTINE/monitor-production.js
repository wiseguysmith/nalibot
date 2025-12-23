#!/usr/bin/env node

const fetch = require('node-fetch');

console.log('🚀 AutoBread XRP Production Trading Monitor');
console.log('===========================================');
console.log('💰 Goal: Dynamic Balance → 60% Profit');
console.log('⏰ Started:', new Date().toLocaleString());
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
let targetReached = false;

async function monitorProduction() {
  try {
    // Get initial production status
    const response = await fetch(`${baseUrl}/api/trading/production`);
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        initialBalance = data.data.balance || 125;
        maxBalance = initialBalance;
        minBalance = initialBalance;
        
        console.log('✅ XRP Production Engine Status:', data.data.isActive ? 'ACTIVE' : 'STOPPED');
        console.log(`💰 Initial Balance: $${initialBalance.toFixed(2)}`);
        console.log(`🎯 Target Profit: Dynamic (60% of current balance)`);
        console.log('🛡️  Risk Controls: ENABLED');
        console.log('   • Max 20% drawdown');
        console.log('   • Max 8% risk per trade');
        console.log('   • Max 15% daily loss');
        console.log('   • Auto-stop on drawdown');
        console.log('   • XRP volatility breakout strategy');
        console.log('');
      } else {
        console.log('❌ Could not connect to production engine');
        return;
      }
    } else {
      console.log('❌ Could not connect to production API');
      return;
    }
  } catch (error) {
    console.log('❌ Could not connect to production system. Make sure it\'s running on http://localhost:3000');
    return;
  }

  // Monitor every 30 seconds
  const monitorInterval = setInterval(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/trading/production`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const performance = data.data.performance;
          const recentTrades = data.data.recentTrades;
          const isActive = data.data.isActive;
          
          // Update session stats
          const currentBalance = performance?.totalBalance || data.data.balance;
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
          const targetProgress = (currentBalance - initialBalance) / (initialBalance * 0.6) * 100;
          
          // Check if target reached
          if (currentBalance >= initialBalance * 1.6 && !targetReached) {
            targetReached = true;
            console.log('🎉🎉🎉 TARGET REACHED! 60% PROFIT GOAL ACHIEVED! 🎉🎉🎉');
            console.log('==================================================');
          }
          
          // Clear console and show updated status
          console.clear();
          console.log('🚀 AutoBread XRP Production Trading Monitor');
          console.log('===========================================');
          console.log(`⏰ Session Time: ${((Date.now() - sessionStartTime) / (1000 * 60)).toFixed(0)} minutes`);
          console.log(`💰 Goal: $125 → $200 | Progress: ${targetProgress.toFixed(1)}%`);
          console.log(`🔄 Engine Status: ${isActive ? '🟢 ACTIVE' : '🔴 STOPPED'}`);
          console.log('');
          
          // Performance Summary
          console.log('📊 PRODUCTION PERFORMANCE');
          console.log('-------------------------');
          console.log(`💰 Current Balance: $${currentBalance.toFixed(2)}`);
          console.log(`📈 Session P&L: ${sessionPnL >= 0 ? '+' : ''}${sessionPnL.toFixed(2)}%`);
          console.log(`📉 Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
          console.log(`🔄 Total Trades: ${tradeCount}`);
          console.log(`🎯 Win Rate: ${winRate.toFixed(1)}%`);
          console.log(`💰 Avg Trade P&L: ${avgTradePnL >= 0 ? '+' : ''}${avgTradePnL.toFixed(2)}`);
          console.log('');
          
          // Target Progress
          console.log('🎯 TARGET PROGRESS');
          console.log('------------------');
          const progressBar = '█'.repeat(Math.floor(targetProgress / 5)) + '░'.repeat(20 - Math.floor(targetProgress / 5));
          console.log(`[${progressBar}] ${targetProgress.toFixed(1)}%`);
          console.log(`$${(currentBalance - initialBalance).toFixed(2)} / $75.00 (Goal: $200.00)`);
          console.log('');
          
          // Risk Assessment
          console.log('🛡️  RISK ASSESSMENT');
          console.log('-------------------');
          const riskLevel = currentDrawdown < 8 ? '🟢 LOW' : 
                           currentDrawdown < 15 ? '🟡 MODERATE' : 
                           currentDrawdown < 20 ? '🟠 HIGH' : '🔴 CRITICAL';
          console.log(`Risk Level: ${riskLevel}`);
          console.log(`Current Drawdown: ${currentDrawdown.toFixed(2)}%`);
          console.log(`Daily P&L: ${performance?.dailyPnL >= 0 ? '+' : ''}${performance?.dailyPnL?.toFixed(2) || '0'}%`);
          console.log(`Sharpe Ratio: ${performance?.sharpeRatio?.toFixed(2) || '0'}`);
          console.log('');
          
          // Recent Trades
          console.log('🔄 RECENT TRADES (Last 5)');
          console.log('-------------------------');
          recentTrades.slice(0, 5).forEach(trade => {
            const time = new Date(trade.timestamp).toLocaleTimeString();
            const pnlColor = trade.profit && trade.profit > 0 ? '\x1b[32m' : '\x1b[31m';
            const resetColor = '\x1b[0m';
            console.log(`${time} ${trade.pair} ${trade.type} $${trade.amount.toFixed(2)} ${pnlColor}${trade.profit ? (trade.profit >= 0 ? '+' : '') + trade.profit.toFixed(2) : '-'}${resetColor} (${trade.strategy})`);
          });
          console.log('');
          
          // Risk Alerts
          if (currentDrawdown > 15) {
            const alert = `⚠️  HIGH DRAWDOWN ALERT: ${currentDrawdown.toFixed(2)}%`;
            if (!riskAlerts.includes(alert)) {
              riskAlerts.push(alert);
              console.log(alert);
            }
          }
          
          if (performance?.dailyPnL < -12) {
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
          
          // Emergency Instructions
          if (currentDrawdown > 18) {
            console.log('🚨 EMERGENCY WARNING:');
            console.log('   Consider stopping trading if drawdown continues');
            console.log('   Visit: http://localhost:3000/production');
            console.log('   Click "Emergency Stop" if needed');
            console.log('');
          }
          
          // Success Message
          if (targetReached) {
            console.log('🎉 SUCCESS: $200 TARGET ACHIEVED!');
            console.log('================================');
            console.log('✅ Consider stopping trading to secure profits');
            console.log('✅ Visit dashboard to review performance');
            console.log('✅ Monitor for any remaining positions');
            console.log('');
          }
          
        } else {
          console.log('❌ Could not fetch production data');
        }
      } else {
        console.log('❌ Could not connect to production API');
      }
    } catch (error) {
      console.log('❌ Monitoring error:', error.message);
    }
  }, 30000); // Every 30 seconds
}

// Start monitoring
monitorProduction();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Production monitoring stopped by user');
  console.log('✅ Production engine continues running in background');
  console.log('📊 Visit http://localhost:3000/production for dashboard');
  process.exit(0);
}); 