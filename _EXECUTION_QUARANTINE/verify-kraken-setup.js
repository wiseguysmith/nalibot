#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

console.log('🔍 Verifying Kraken API Setup...');
console.log('================================');

async function verifySetup() {
  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    console.log('📋 Current Setup:');
    console.log('   API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : '❌ NOT SET');
    console.log('   API Secret:', apiSecret ? `${apiSecret.substring(0, 8)}...` : '❌ NOT SET');

    if (!apiKey || !apiSecret) {
      console.log('\n❌ API credentials missing!');
      console.log('   Please update your .env file with new Kraken API credentials.');
      return;
    }

    // Test private API access
    console.log('\n🔐 Testing Private API Access...');
    const crypto = require('crypto');
    const nonce = Date.now().toString();
    const path = '/0/private/Balance';
    
    const postData = new URLSearchParams({
      nonce
    }).toString();

    const signature = crypto
      .createHmac('sha512', Buffer.from(apiSecret, 'base64'))
      .update(path + postData)
      .digest('base64');

    const response = await axios.post('https://api.kraken.com/0/private/Balance', postData, {
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.error && response.data.error.length > 0) {
      console.log('❌ API Error:', response.data.error);
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check if your API key is active');
      console.log('   2. Verify permissions include "Query Funds"');
      console.log('   3. Make sure you copied the full API key and secret');
      return;
    }

    console.log('✅ API Access Successful!');
    console.log('📊 Account Balances:');
    
    const balances = response.data.result;
    let totalUSD = 0;
    
    for (const [asset, amount] of Object.entries(balances)) {
      const balance = parseFloat(amount);
      if (balance > 0) {
        console.log(`   ${asset}: ${balance}`);
        if (asset === 'ZUSD' || asset === 'USD') {
          totalUSD += balance;
        }
      }
    }
    
    console.log(`\n💰 Total USD Balance: $${totalUSD.toFixed(2)}`);
    
    if (totalUSD > 0) {
      console.log('\n🎉 Ready for Real Trading!');
      console.log('   - Visit: http://localhost:3003/production');
      console.log('   - Click "Start Production Trading"');
      console.log('   - The bot will trade with your real balance');
    } else {
      console.log('\n⚠️  No USD balance found');
      console.log('   - Add funds to your Kraken account');
      console.log('   - Or the bot will use available crypto balances');
    }

  } catch (error) {
    console.log('❌ Verification failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data);
    }
  }
}

verifySetup(); 