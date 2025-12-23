const { KuCoinWrapper } = require('./src/services/kucoinWrapper');
require('dotenv').config();

async function testKuCoinTrading() {
  try {
    console.log('🚀 Testing KuCoin API Trading...');
    console.log('================================');
    
    // Check environment variables
    if (!process.env.KUCOIN_API_KEY || !process.env.KUCOIN_SECRET_KEY || !process.env.KUCOIN_PASSPHRASE) {
      console.error('❌ Missing KuCoin API credentials in .env file');
      console.log('Please add:');
      console.log('KUCOIN_API_KEY=your_api_key');
      console.log('KUCOIN_SECRET_KEY=your_api_secret');
      console.log('KUCOIN_PASSPHRASE=your_trading_password');
      return;
    }
    
    const kucoin = new KuCoinWrapper(
      process.env.KUCOIN_API_KEY,
      process.env.KUCOIN_SECRET_KEY,
      process.env.KUCOIN_PASSPHRASE
    );

    // Test 1: Connection test
    console.log('\n🔗 Testing API connection...');
    const connectionOk = await kucoin.testConnection();
    if (!connectionOk) {
      console.error('❌ KuCoin API connection failed');
      return;
    }
    console.log('✅ KuCoin API connection successful');

    // Test 2: Get balance
    console.log('\n📊 Checking account balance...');
    const balance = await kucoin.getBalance();
    console.log('Account balances:');
    balance.data.forEach(acc => {
      if (parseFloat(acc.available) > 0) {
        console.log(`  ${acc.currency}: ${acc.available} (available) / ${acc.total} (total)`);
      }
    });

    // Test 3: Get BTC price
    console.log('\n💰 Getting BTC price...');
    const btcPrice = await kucoin.getCurrentPrice('BTC-USDT');
    console.log(`BTC price: $${btcPrice.toFixed(2)}`);

    // Test 4: Get portfolio value
    console.log('\n💼 Calculating portfolio value...');
    const portfolioValue = await kucoin.getPortfolioValue();
    console.log(`Total portfolio value: $${portfolioValue.toFixed(2)}`);

    // Test 5: Check USDT balance for trading
    const usdtBalance = balance.data.find(acc => acc.currency === 'USDT');
    const usdtAmount = usdtBalance ? parseFloat(usdtBalance.available) : 0;
    
    console.log(`\n💵 USDT available: $${usdtAmount.toFixed(2)}`);
    
    if (usdtAmount < 10) {
      console.log('⚠️ Insufficient USDT balance for test order (need at least $10)');
      console.log('💡 Please add some USDT to your account to test trading');
      return;
    }

    // Test 6: Place small test order (if balance sufficient)
    if (usdtAmount >= 10) {
      console.log('\n📈 Placing test market buy order...');
      
      try {
        // Calculate order size for $5 worth of BTC
        const testAmount = 5; // $5
        const orderSize = await kucoin.calculateOrderSize('BTC-USDT', testAmount);
        
        console.log(`Order size: ${orderSize} BTC (≈ $${testAmount})`);
        
        const order = await kucoin.marketBuy('BTC-USDT', orderSize);
        console.log('✅ Test order placed successfully!');
        console.log(`Order ID: ${order.data.orderId}`);
        
        // Test 7: Check order status
        console.log('\n🔍 Checking order status...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const orderStatus = await kucoin.getOrder(order.data.orderId);
        console.log(`Order status: ${orderStatus.data.status}`);
        console.log(`Order details: ${orderStatus.data.side} ${orderStatus.data.size} ${orderStatus.data.symbol}`);
        
        if (orderStatus.data.price) {
          console.log(`Execution price: $${orderStatus.data.price}`);
        }
        
      } catch (orderError) {
        console.error('❌ Test order failed:', orderError.message);
        console.log('This might be due to:');
        console.log('- Insufficient balance');
        console.log('- Market conditions');
        console.log('- API permissions');
        console.log('- Rate limits');
      }
    }

    // Test 8: Get open orders
    console.log('\n📋 Checking open orders...');
    const openOrders = await kucoin.getOpenOrders();
    console.log(`Open orders: ${openOrders.data.items.length}`);

    // Test 9: Get trading pairs
    console.log('\n🔄 Getting available trading pairs...');
    const pairs = await kucoin.getTradingPairs();
    const popularPairs = pairs.data.filter(pair => 
      pair.symbol.includes('BTC') || 
      pair.symbol.includes('ETH') || 
      pair.symbol.includes('USDT')
    ).slice(0, 5);
    
    console.log('Popular trading pairs:');
    popularPairs.forEach(pair => {
      console.log(`  ${pair.symbol} - ${pair.name}`);
    });

    console.log('\n✅ KuCoin trading test completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('1. Review the test results above');
    console.log('2. Check your KuCoin account for the executed trade');
    console.log('3. Integrate KuCoin wrapper into your AutoBread bot');
    console.log('4. Start with small amounts and monitor closely');
    
  } catch (error) {
    console.error('❌ KuCoin test failed:', error.message);
    console.error('Full error:', error);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your API credentials are correct');
    console.log('2. Ensure API key has trading permissions');
    console.log('3. Verify your account is verified');
    console.log('4. Check if you have sufficient balance');
    console.log('5. Try again in a few minutes (rate limits)');
  }
}

async function testKuCoinConnection() {
  try {
    console.log('🔗 Testing KuCoin API connection only...');
    
    const kucoin = new KuCoinWrapper(
      process.env.KUCOIN_API_KEY,
      process.env.KUCOIN_SECRET_KEY,
      process.env.KUCOIN_PASSPHRASE
    );
    
    const connectionOk = await kucoin.testConnection();
    if (connectionOk) {
      console.log('✅ KuCoin API connection successful');
      return true;
    } else {
      console.log('❌ KuCoin API connection failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--connection-only')) {
    testKuCoinConnection();
  } else {
    testKuCoinTrading();
  }
}

module.exports = { testKuCoinTrading, testKuCoinConnection }; 