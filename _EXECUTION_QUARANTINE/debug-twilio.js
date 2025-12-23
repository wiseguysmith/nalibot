const axios = require('axios');
require('dotenv').config();

console.log('🔍 Twilio Debug Script\n');

// Check if credentials exist
console.log('📋 Checking Twilio Credentials:');
console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Found' : '❌ Missing');
console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Found' : '❌ Missing');
console.log('Phone Number:', process.env.TWILIO_PHONE_NUMBER ? '✅ Found' : '❌ Missing');

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  console.log('\n🔑 Testing Twilio Authentication...');
  
  // Test with detailed error handling
  axios.get(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
    {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
    }
  )
  .then(response => {
    console.log('✅ Twilio API Connected Successfully!');
    console.log('Account Name:', response.data.friendly_name);
    console.log('Account Status:', response.data.status);
    console.log('Account Type:', response.data.type);
  })
  .catch(error => {
    console.log('❌ Twilio API Error:');
    console.log('Status Code:', error.response?.status);
    console.log('Error Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Possible Solutions:');
      console.log('1. Check if Account SID is correct (starts with "AC")');
      console.log('2. Check if Auth Token is correct (not the API key)');
      console.log('3. Verify your Twilio account is active');
      console.log('4. Make sure you copied the full credentials');
    }
  });
} else {
  console.log('\n❌ Missing Twilio credentials in .env file');
  console.log('Add these to your .env file:');
  console.log('TWILIO_ACCOUNT_SID=your_account_sid');
  console.log('TWILIO_AUTH_TOKEN=your_auth_token');
}

console.log('\n📖 Twilio Setup Instructions:');
console.log('1. Go to: https://console.twilio.com/');
console.log('2. Copy Account SID (starts with "AC")');
console.log('3. Copy Auth Token (not the API key)');
console.log('4. Add both to your .env file'); 