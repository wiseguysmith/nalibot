#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Testing Environment Variables...');
console.log('===================================');

const apiKey = process.env.KRAKEN_API_KEY;
const apiSecret = process.env.KRAKEN_API_SECRET;

console.log('KRAKEN_API_KEY:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET');
console.log('KRAKEN_API_SECRET:', apiSecret ? `${apiSecret.substring(0, 8)}...` : 'NOT SET');

if (apiKey && apiSecret) {
  console.log('✅ Environment variables are set!');
  console.log('   The system should be able to connect to Kraken.');
} else {
  console.log('❌ Environment variables are missing!');
  console.log('');
  console.log('📋 To fix this:');
  console.log('1. Create a .env file in the project root');
  console.log('2. Add your Kraken API credentials:');
  console.log('   KRAKEN_API_KEY=your_api_key_here');
  console.log('   KRAKEN_API_SECRET=your_private_key_here');
  console.log('3. Get API keys from: https://www.kraken.com/u/settings/api');
} 