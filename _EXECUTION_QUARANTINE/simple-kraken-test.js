#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

console.log('🔍 SIMPLE KRAKEN API TEST');
console.log('==========================');

async function simpleTest() {
  try {
    const apiKey = process.env.KRAKEN_API_KEY;
    const apiSecret = process.env.KRAKEN_API_SECRET;

    console.log('📋 Current API Keys:');
    console.log('   Key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT SET');
    console.log('   Secret:', apiSecret ? apiSecret.substring(0, 20) + '...' : 'NOT SET');

    if (!apiKey || !apiSecret) {
      console.log('❌ API credentials missing!');
      return;
    }

    // Test 1: Simple public request
    console.log('\n🔗 Test 1: Public API (Time)');
    try {
      const timeResponse = await axios.get('https://api.kraken.com/0/public/Time');
      console.log('✅ Public API works!');
      console.log('   Server time:', timeResponse.data.result.unixtime);
    } catch (error) {
      console.log('❌ Public API failed:', error.message);
    }

    // Test 2: Simple private request with detailed error
    console.log('\n🔐 Test 2: Private API (Balance)');
    try {
      const nonce = Date.now().toString();
      const path = '/0/private/Balance';
      
      const postData = new URLSearchParams({
        nonce
      }).toString();

      console.log('   Nonce:', nonce);
      console.log('   Path:', path);
      console.log('   Post data:', postData);

      const signature = crypto
        .createHmac('sha512', Buffer.from(apiSecret, 'base64'))
        .update(path + postData)
        .digest('base64');

      console.log('   Signature length:', signature.length);

      const response = await axios.post('https://api.kraken.com/0/private/Balance', postData, {
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      console.log('✅ Private API Response:');
      console.log('   Status:', response.status);
      console.log('   Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
      console.log('❌ Private API Error:');
      console.log('   Message:', error.message);
      
      if (axios.isAxiosError(error)) {
        console.log('   Status:', error.response?.status);
        console.log('   Status Text:', error.response?.statusText);
        console.log('   Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('   Request URL:', error.config?.url);
        console.log('   Request Method:', error.config?.method);
        console.log('   Request Headers:', JSON.stringify(error.config?.headers, null, 2));
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

simpleTest(); 