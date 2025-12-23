#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

console.log('🔍 Debugging Kraken API Connection...');
console.log('====================================');

async function debugKraken() {
  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    console.log('📋 API Key Info:');
    console.log('   Key length:', apiKey ? apiKey.length : 'NOT SET');
    console.log('   Secret length:', apiSecret ? apiSecret.length : 'NOT SET');
    console.log('   Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
    console.log('   Secret starts with:', apiSecret ? apiSecret.substring(0, 10) + '...' : 'NOT SET');

    if (!apiKey || !apiSecret) {
      console.log('❌ API credentials missing!');
      return;
    }

    // Test 1: Public API (should work without credentials)
    console.log('\n🔗 Test 1: Public API (Ticker)');
    try {
      const publicResponse = await axios.get('https://api.kraken.com/0/public/Ticker?pair=XRPUSD');
      console.log('✅ Public API works!');
      console.log('   XRP Price:', publicResponse.data.result?.XRPUSD?.c?.[0] || 'N/A');
    } catch (error) {
      console.log('❌ Public API failed:', error.message);
    }

    // Test 2: Private API (Balance)
    console.log('\n🔐 Test 2: Private API (Balance)');
    try {
      const nonce = Date.now().toString();
      const path = '/0/private/Balance';
      
      const postData = new URLSearchParams({
        nonce
      }).toString();

      const signature = crypto
        .createHmac('sha512', Buffer.from(apiSecret, 'base64'))
        .update(path + postData)
        .digest('base64');

      const privateResponse = await axios.post('https://api.kraken.com/0/private/Balance', postData, {
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (privateResponse.data.error && privateResponse.data.error.length > 0) {
        console.log('❌ Private API Error:', privateResponse.data.error);
        
        if (privateResponse.data.error[0].includes('Invalid key')) {
          console.log('\n🔧 INVALID KEY ERROR DETECTED!');
          console.log('   This means:');
          console.log('   1. The API key is wrong/expired');
          console.log('   2. The API key doesn\'t exist');
          console.log('   3. The API key format is incorrect');
          console.log('\n📋 SOLUTION:');
          console.log('   1. Go to: https://www.kraken.com/u/settings/api');
          console.log('   2. Create a NEW API key');
          console.log('   3. Enable permissions: Query Funds, Query Orders');
          console.log('   4. Copy the NEW key and secret to .env file');
        }
      } else {
        console.log('✅ Private API works!');
        console.log('   Account balances:', Object.keys(privateResponse.data.result || {}));
      }

    } catch (error) {
      console.log('❌ Private API failed:', error.message);
      if (axios.isAxiosError(error)) {
        console.log('   Status:', error.response?.status);
        console.log('   Error data:', error.response?.data);
      }
    }

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugKraken(); 