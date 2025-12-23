#!/usr/bin/env node

const fetch = require('node-fetch');

console.log('🔍 Testing Kraken API Connection...');
console.log('===================================');

async function testKrakenConnection() {
  try {
    // Test the production API directly
    console.log('🔗 Testing production API connection...');
    const response = await fetch('http://localhost:3004/api/trading/production');
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        const balance = data.data.balance;
        const xrpData = data.data.xrpData;
        
        console.log('✅ Successfully connected to production API!');
        console.log('📊 Account Information:');
        console.log(`   Total Balance: $${balance.toFixed(2)}`);
        
        if (xrpData) {
          console.log(`   XRP Amount: ${xrpData.xrpAmount.toFixed(2)} XRP`);
          console.log(`   XRP Value: $${xrpData.xrpValue.toFixed(2)}`);
          console.log(`   USD Balance: $${xrpData.usdBalance.toFixed(2)}`);
        }
        
        // Check if this is real data or mock data
        if (balance === 15.00 && xrpData && xrpData.xrpAmount === 25.0) {
          console.log('⚠️  Note: This appears to be mock data (testing mode)');
          console.log('   If you have real Kraken API credentials, check your .env file');
        } else {
          console.log('✅ Real Kraken data detected!');
        }
        
        // Calculate dynamic goal
        const targetGoal = balance * 1.6;
        const profitNeeded = balance * 0.6;
        
        console.log('');
        console.log('🎯 Dynamic Trading Goal:');
        console.log(`   Current Balance: $${balance.toFixed(2)}`);
        console.log(`   Target Goal: $${targetGoal.toFixed(2)} (60% profit)`);
        console.log(`   Profit Needed: $${profitNeeded.toFixed(2)}`);
        
        if (balance < 20) {
          console.log('⚠️  Warning: Balance is low. Consider adding more funds for better trading opportunities.');
        } else {
          console.log('✅ Sufficient balance for XRP trading');
        }
        
        console.log('');
        console.log('🚀 Ready for XRP Trading!');
        console.log('   - Open: http://localhost:3004/production');
        console.log(`   - Goal: $${balance.toFixed(2)} → $${targetGoal.toFixed(2)} (60% profit)`);
        console.log('   - Risk Management: 20% max drawdown');
        
      } else {
        console.log('❌ Production API Error:', data.error);
        console.log('   Details:', data.details);
        console.log('   Message:', data.message);
        
        if (data.message && data.message.includes('credentials')) {
          console.log('');
          console.log('📋 Setup Instructions:');
          console.log('1. Create a .env file in the project root');
          console.log('2. Add your Kraken API credentials:');
          console.log('   KRAKEN_API_KEY=your_api_key_here');
          console.log('   KRAKEN_API_SECRET=your_private_key_here');
            
          console.log('3. Get API keys from: https://www.kraken.com/u/settings/api');
        }
      }
    } else {
      console.log('❌ Could not connect to production API');
      console.log('   Make sure the development server is running: npm run dev');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure the dev server is running: npm run dev');
    console.log('2. Check if port 3002 is available');
    console.log('3. Verify your Kraken API credentials in .env file');
  }
}

testKrakenConnection();