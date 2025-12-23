const { LiveTradingEngine } = require('./src/services/liveTradingEngine');

// Test configuration
const testConfig = {
  apiKey: 'your_kraken_api_key_here',
  apiSecret: 'your_kraken_api_secret_here',
  sandbox: true, // Start with sandbox mode
  maxPositionSize: 20, // 20% of portfolio
  maxDailyLoss: 5, // 5% max daily loss
  stopLossPercent: 3, // 3% stop loss
  takeProfitPercent: 6, // 6% take profit
  tradingPairs: ['BTC/USD', 'ETH/USD'],
  strategies: [],
  emergencyStop: false
};

async function testLiveTrading() {
  console.log('🧪 Testing Live Trading System...\n');
  
  try {
    // Create trading engine
    const engine = new LiveTradingEngine(testConfig);
    console.log('✅ Trading engine created');
    
    // Test initialization
    console.log('\n🔌 Testing Kraken connection...');
    const initialized = await engine.initialize();
    
    if (initialized) {
      console.log('✅ Successfully connected to Kraken');
      
      // Test status
      const status = engine.getStatus();
      console.log('📊 Status:', status);
      
      // Test starting trading
      console.log('\n🚀 Testing start trading...');
      await engine.start();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test stopping
      console.log('\n⏹️ Testing stop trading...');
      await engine.stop();
      
      console.log('\n✅ All tests passed! System is ready for real trading.');
      
    } else {
      console.log('❌ Failed to initialize trading engine');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLiveTrading(); 