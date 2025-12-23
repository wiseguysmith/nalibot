#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

console.log('🔍 Testing Kraken API Direct Connection...');
console.log('==========================================');

async function testKrakenDirect() {
  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET');
    console.log('API Secret:', apiSecret ? `${apiSecret.substring(0, 8)}...` : 'NOT SET');

    if (!apiKey || !apiSecret) {
      console.log('❌ API credentials not found in .env file');
      return;
    }

    // Test 1: Public API (no authentication needed)
    console.log('\n🔗 Testing Public API...');
    try {
      const publicResponse = await axios.get('https://api.kraken.com/0/public/Ticker', {
        params: { pair: 'XRPUSD' }
      });
      console.log('✅ Public API working!');
      console.log('   XRP Price:', publicResponse.data.result?.XRPUSD?.c?.[0] || 'N/A');
    } catch (error) {
      console.log('❌ Public API failed:', error.message);
      if (axios.isAxiosError(error)) {
        console.log('   Status:', error.response?.status);
        console.log('   Data:', error.response?.data);
      }
    }

    // Test 2: Private API (with authentication)
    console.log('\n🔐 Testing Private API...');
    try {
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

      const privateResponse = await axios.post('https://api.kraken.com/0/private/Balance', postData, {
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Private API working!');
      console.log('   Balance data received');
      
      if (privateResponse.data.error && privateResponse.data.error.length > 0) {
        console.log('   API Errors:', privateResponse.data.error);
      } else {
        console.log('   Account balances:', Object.keys(privateResponse.data.result || {}));
      }
      
    } catch (error) {
      console.log('❌ Private API failed:', error.message);
      if (axios.isAxiosError(error)) {
        console.log('   Status:', error.response?.status);
        console.log('   Data:', error.response?.data);
        console.log('   URL:', error.config?.url);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testKrakenDirect(); 