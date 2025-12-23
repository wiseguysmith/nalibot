const fetch = require('node-fetch');

/**
 * Test AutoBread Daily Digest
 * 
 * This script tests the daily digest email functionality.
 */

async function testDailyDigest() {
  console.log('🧪 Testing AutoBread Daily Digest');
  console.log('==================================');
  
  const testEmail = 'test@example.com';
  
  try {
    console.log(`📧 Sending test digest to ${testEmail}...`);
    
    const response = await fetch('http://localhost:3001/api/digest/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userEmail: testEmail
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Daily digest test successful!');
      console.log('📊 Digest data generated:');
      console.log(`   Date: ${result.digestData.date}`);
      console.log(`   Total Balance: $${result.digestData.totalBalance.toFixed(2)}`);
      console.log(`   Daily P&L: $${result.digestData.dailyPnL.toFixed(2)}`);
      console.log(`   Win Rate: ${result.digestData.winRate.toFixed(1)}%`);
      console.log(`   Total Trades: ${result.digestData.totalTrades}`);
      console.log(`   Top Strategy: ${result.digestData.topPerformingStrategy.name}`);
      console.log(`   Market Sentiment: ${result.digestData.marketSummary.marketSentiment}`);
    } else {
      console.error('❌ Daily digest test failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing daily digest:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the server is running on http://localhost:3001');
      console.log('   Run: npm run dev');
    }
  }
}

// Run the test
testDailyDigest(); 