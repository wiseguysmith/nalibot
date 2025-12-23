// Test script for real market data functionality
async function testRealMarketData() {
  console.log('🚀 Testing Real Market Data Integration...\n');

  try {
    // Test 1: Test API endpoint directly
    console.log('📊 Test 1: Testing market data API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/market-data/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: 'BTC/USD',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        timeframe: '1h',
        provider: 'kraken'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API Test: ${data.data.dataPoints} data points loaded`);
      console.log(`📈 Data Quality: ${data.data.quality?.qualityScore?.toFixed(1) || 'N/A'}/100`);
      console.log(`📊 Sample data: ${data.data.data[0] ? 'Available' : 'None'}`);
    } else {
      console.log(`❌ API Test failed: ${response.status}`);
    }

    // Test 2: Test cache statistics
    console.log('\n📊 Test 2: Testing cache statistics...');
    const cacheResponse = await fetch('http://localhost:3000/api/market-data/cache-stats');
    if (cacheResponse.ok) {
      const cacheData = await cacheResponse.json();
      console.log(`📦 Cache size: ${cacheData.stats.size} entries`);
      console.log(`💾 Memory usage: ${cacheData.stats.totalSizeMB} MB`);
    } else {
      console.log(`❌ Cache test failed: ${cacheResponse.status}`);
    }

    // Test 3: Test backtest with real data
    console.log('\n📊 Test 3: Testing backtest with real data...');
    const backtestResponse = await fetch('http://localhost:3000/api/backtest/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy: {
          id: 'test-strategy',
          name: 'Test Strategy',
          type: 'trend-following',
          parameters: {
            timeframe: '1h',
            riskPercent: 2,
            stopLoss: 5,
            takeProfit: 10,
            maxPositions: 3
          }
        },
        symbol: 'BTC/USD',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        initialCapital: 10000,
        provider: 'kraken'
      }),
    });

    if (backtestResponse.ok) {
      const backtestData = await backtestResponse.json();
      console.log(`✅ Backtest completed: ${backtestData.result.totalReturn.toFixed(2)}% return`);
      console.log(`📊 Total trades: ${backtestData.result.totalTrades}`);
      console.log(`📈 Sharpe ratio: ${backtestData.result.sharpeRatio.toFixed(2)}`);
      console.log(`📉 Max drawdown: ${backtestData.result.maxDrawdown.toFixed(2)}%`);
    } else {
      console.log(`❌ Backtest failed: ${backtestResponse.status}`);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n🌐 Visit http://localhost:3000/saas to see the new UI with real market data!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
    console.log('\n🔧 Then visit http://localhost:3000/saas to see the changes!');
  }
}

// Run the test
testRealMarketData(); 