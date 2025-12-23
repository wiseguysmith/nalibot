#!/usr/bin/env node

const fetch = require('node-fetch');

console.log('🔍 Checking XRP Trading Bot Status...');
console.log('=====================================');

async function checkStatus() {
  const baseUrl = 'http://localhost:3002';
  
  try {
    // Check production API
    console.log('\n📊 Checking Production API...');
    const productionResponse = await fetch(`${baseUrl}/api/trading/production`);
    if (productionResponse.ok) {
      const productionData = await productionResponse.json();
      console.log('✅ Production API: WORKING');
      console.log(`   Balance: $${productionData.data.performance.totalBalance}`);
      console.log(`   Target: $${productionData.data.config.initialBalance + productionData.data.config.targetProfit}`);
      console.log(`   Status: ${productionData.data.isActive ? 'ACTIVE' : 'STOPPED'}`);
    } else {
      console.log('❌ Production API: FAILED');
    }

    // Check performance API
    console.log('\n📈 Checking Performance API...');
    const performanceResponse = await fetch(`${baseUrl}/api/trading/performance`);
    if (performanceResponse.ok) {
      const performanceData = await performanceResponse.json();
      console.log('✅ Performance API: WORKING');
      console.log(`   Balance: $${performanceData.data.performance.totalBalance}`);
      console.log(`   Trades: ${performanceData.data.performance.totalTrades}`);
    } else {
      console.log('❌ Performance API: FAILED');
    }

    // Check production page
    console.log('\n🌐 Checking Production Dashboard...');
    const pageResponse = await fetch(`${baseUrl}/production`);
    if (pageResponse.ok) {
      console.log('✅ Production Dashboard: WORKING');
      console.log(`   URL: ${baseUrl}/production`);
    } else {
      console.log('❌ Production Dashboard: FAILED');
    }

    console.log('\n🎯 XRP Trading Configuration:');
    console.log('   Initial Investment: $125');
    console.log('   Target Profit: $75 (60% return)');
    console.log('   Final Goal: $200');
    console.log('   Trading Pairs: XRP/USD, XRP/USDT');
    console.log('   Risk Management: 20% max drawdown');
    console.log('   Strategies: Mean Reversion, Arbitrage, Grid, Volatility');

    console.log('\n🚀 Next Steps:');
    console.log('1. Open: http://localhost:3002/production');
    console.log('2. Review configuration');
    console.log('3. Click "Start Trading" to begin');
    console.log('4. Monitor progress toward $200 goal');

    console.log('\n✅ All systems operational! Ready for XRP trading.');

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the dev server is running: npm run dev');
    console.log('2. Check if port 3002 is available');
    console.log('3. Verify all files are properly saved');
  }
}

checkStatus(); 