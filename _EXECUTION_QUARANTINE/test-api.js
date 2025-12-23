const axios = require('axios');
require('dotenv').config();

console.log('🔑 Testing API Connections...\n');

// Test Kraken API
async function testKrakenAPI() {
  console.log('🏦 Testing Kraken API...');
  
  try {
    // Test public API (no credentials needed)
    const publicResponse = await axios.get('https://api.kraken.com/0/public/Time');
    console.log('✅ Kraken public API: Connected');
    
    // Test private API (if credentials provided)
    if (process.env.KRAKEN_API_KEY && process.env.KRAKEN_API_SECRET) {
      console.log('✅ Kraken credentials: Found');
      
      // Note: We can't test private API without proper signature
      // This will be tested when the bot runs
      console.log('ℹ️  Private API will be tested when bot starts');
    } else {
      console.log('⚠️  Kraken credentials: Not found in .env file');
      console.log('   Add KRAKEN_API_KEY and KRAKEN_API_SECRET to .env');
    }
    
  } catch (error) {
    console.log('❌ Kraken API test failed:', error.message);
  }
}

// Test Twilio API
async function testTwilioAPI() {
  console.log('\n📱 Testing Twilio API...');
  
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    console.log('✅ Twilio credentials: Found');
    
    try {
      // Test Twilio API connection
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
        {
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN
          }
        }
      );
      
      if (response.data.status === 'active') {
        console.log('✅ Twilio API: Connected');
        console.log(`   Account: ${response.data.friendly_name}`);
        console.log(`   Status: ${response.data.status}`);
      } else {
        console.log('⚠️  Twilio account not active');
      }
      
    } catch (error) {
      console.log('❌ Twilio API test failed:', error.message);
    }
  } else {
    console.log('ℹ️  Twilio credentials: Not found (optional)');
    console.log('   Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env for SMS notifications');
  }
}

// Test environment variables
function testEnvironmentVariables() {
  console.log('\n⚙️  Checking Environment Variables...');
  
  const required = ['KRAKEN_API_KEY', 'KRAKEN_API_SECRET'];
  const optional = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'NOTIFICATION_PHONE_NUMBER'];
  
  console.log('\nRequired Variables:');
  required.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
    }
  });
  
  console.log('\nOptional Variables:');
  optional.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`ℹ️  ${varName}: Not set (optional)`);
    }
  });
}

// Main test function
async function runTests() {
  console.log('🚀 AI Trading Bot - API Connection Test\n');
  console.log('=====================================\n');
  
  await testKrakenAPI();
  await testTwilioAPI();
  testEnvironmentVariables();
  
  console.log('\n=====================================');
  console.log('📋 Test Summary:');
  
  if (process.env.KRAKEN_API_KEY && process.env.KRAKEN_API_SECRET) {
    console.log('✅ Ready to start trading bot!');
    console.log('   Run: npm run dev');
  } else {
    console.log('❌ Missing required Kraken API credentials');
    console.log('   Follow API_SETUP_GUIDE.md to set up credentials');
  }
  
  console.log('\n📖 For detailed setup instructions, see:');
  console.log('   - API_SETUP_GUIDE.md');
  console.log('   - SETUP_GUIDE.md');
}

// Run tests
runTests().catch(console.error); 