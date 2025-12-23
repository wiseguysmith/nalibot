#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

console.log('🔍 TESTING API KEY FORMATS');
console.log('===========================');

async function testFormats() {
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET;

  console.log('📋 API Key Info:');
  console.log('   Key length:', apiKey?.length);
  console.log('   Secret length:', apiSecret?.length);
  console.log('   Key:', apiKey);
  console.log('   Secret:', apiSecret);

  if (!apiKey || !apiSecret) {
    console.log('❌ API credentials missing!');
    return;
  }

  // Test different encoding methods
  const nonce = Date.now().toString();
  const path = '/0/private/Balance';
  const postData = new URLSearchParams({ nonce }).toString();

  console.log('\n🔐 Testing different signature methods:');

  // Method 1: Base64 decode (current method)
  try {
    console.log('\n📝 Method 1: Base64 decode');
    const signature1 = crypto
      .createHmac('sha512', Buffer.from(apiSecret, 'base64'))
      .update(path + postData)
      .digest('base64');

    const response1 = await axios.post('https://api.kraken.com/0/private/Balance', postData, {
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature1,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('   Result:', response1.data.error ? '❌ ' + response1.data.error[0] : '✅ Success');
  } catch (error) {
    console.log('   Result: ❌', error.response?.data?.error?.[0] || error.message);
  }

  // Method 2: Use secret as-is (no base64 decode)
  try {
    console.log('\n📝 Method 2: Use secret as-is');
    const signature2 = crypto
      .createHmac('sha512', apiSecret)
      .update(path + postData)
      .digest('base64');

    const response2 = await axios.post('https://api.kraken.com/0/private/Balance', postData, {
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature2,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('   Result:', response2.data.error ? '❌ ' + response2.data.error[0] : '✅ Success');
  } catch (error) {
    console.log('   Result: ❌', error.response?.data?.error?.[0] || error.message);
  }

  // Method 3: Try URL-safe base64
  try {
    console.log('\n📝 Method 3: URL-safe base64');
    const urlSafeSecret = apiSecret.replace(/-/g, '+').replace(/_/g, '/');
    const signature3 = crypto
      .createHmac('sha512', Buffer.from(urlSafeSecret, 'base64'))
      .update(path + postData)
      .digest('base64');

    const response3 = await axios.post('https://api.kraken.com/0/private/Balance', postData, {
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature3,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('   Result:', response3.data.error ? '❌ ' + response3.data.error[0] : '✅ Success');
  } catch (error) {
    console.log('   Result: ❌', error.response?.data?.error?.[0] || error.message);
  }

  console.log('\n🔧 TROUBLESHOOTING TIPS:');
  console.log('1. Make sure you copied the ENTIRE API key and secret');
  console.log('2. Check if there are any extra spaces or characters');
  console.log('3. Verify the API key is active in your Kraken account');
  console.log('4. Try creating a new API key with different permissions');
  console.log('5. Check if your Kraken account has any restrictions');
}

testFormats(); 