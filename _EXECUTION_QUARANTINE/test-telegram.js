// Test script for Telegram notifications
const fetch = require('node-fetch');

async function testTelegramNotifications() {
  console.log('🤖 Testing AutoBread Telegram Notifications...\n');

  const baseUrl = 'http://localhost:3000/api/telegram';

  const tests = [
    {
      name: 'Welcome Message',
      type: 'welcome',
      data: { username: 'TestUser' }
    },
    {
      name: 'Trade Notification',
      type: 'trade',
      data: {
        pair: 'BTC/USD',
        type: 'BUY',
        amount: 100,
        price: 45000,
        profit: 2.5,
        strategy: 'Mean Reversion',
        timestamp: new Date()
      }
    },
    {
      name: 'Performance Update',
      type: 'performance',
      data: {
        dailyPnL: 15.50,
        totalReturn: 8.2,
        winRate: 73.5,
        activeTrades: 3,
        timestamp: new Date()
      }
    },
    {
      name: 'Risk Alert',
      type: 'alert',
      data: {
        type: 'drawdown',
        message: 'Portfolio drawdown approaching 8% limit. Consider risk adjustment.',
        severity: 'warning',
        timestamp: new Date()
      }
    },
    {
      name: 'System Notification',
      type: 'system',
      data: {
        title: 'Strategy Update',
        message: 'Mean Reversion strategy parameters optimized for current market conditions.',
        priority: 'medium'
      }
    },
    {
      name: 'Daily Summary',
      type: 'daily_summary',
      data: {
        totalTrades: 12,
        winningTrades: 9,
        totalPnL: 45.75,
        bestTrade: 8.20,
        worstTrade: -2.10,
        winRate: 75.0
      }
    }
  ];

  for (const test of tests) {
    console.log(`📤 Testing: ${test.name}`);
    
    try {
      const response = await fetch(`${baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: test.type,
          data: test.data
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`✅ ${test.name}: Success`);
      } else {
        console.log(`❌ ${test.name}: Failed - ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }

    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 Telegram notification tests completed!');
  console.log('\n📱 Check your Telegram for notifications (if configured)');
  console.log('\n💡 To enable Telegram notifications:');
  console.log('1. Create a Telegram bot with @BotFather');
  console.log('2. Get your bot token');
  console.log('3. Get your chat ID');
  console.log('4. Add to .env file:');
  console.log('   TELEGRAM_BOT_TOKEN=your_bot_token');
  console.log('   TELEGRAM_CHAT_ID=your_chat_id');
}

// Run the test
testTelegramNotifications().catch(console.error); 