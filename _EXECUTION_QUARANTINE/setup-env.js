#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up .env file...');
console.log('================================');

const envContent = `# ========================================
# AI Trading Bot Environment Variables
# ========================================

# ========================================
# KRAKEN API CREDENTIALS (REQUIRED)
# ========================================
# Get these from: https://www.kraken.com/u/settings/api
# Make sure to enable: Query Funds, Query Orders, Add & Cancel Orders
KRAKEN_API_KEY=idCrybGHT4u/e7IbbzYntGyILzHhbMr2qwX3Mj/ftYNwGR6JaJwiYZha
KRAKEN_API_SECRET=V/C1PdkS1uASJwKCR4ivgtg+iWRNzQ9gsgvm5VF3qlD25iqbtf5+/SQRg4yh7xyS82npIHBkkKKSPqRF212DjQ==

# ========================================
# TWILIO SMS CONFIGURATION (OPTIONAL)
# ========================================
# Get these from: https://console.twilio.com/
# Free account includes $15-20 credit for testing
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
NOTIFICATION_PHONE_NUMBER=your_personal_phone_number_here

# ========================================
# TRADING CONFIGURATION
# ========================================
# These are set for $100 investment testing
MAX_DRAWDOWN_PERCENTAGE=25
RISK_PER_TRADE_PERCENTAGE=20
VOLATILITY_LOOKBACK_PERIOD=14

# ========================================
# DEVELOPMENT SETTINGS
# ========================================
NODE_ENV=development
NEXT_PUBLIC_KRAKEN_API_KEY=\${KRAKEN_API_KEY}
NEXT_PUBLIC_KRAKEN_API_SECRET=\${KRAKEN_API_SECRET}
`;

try {
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ .env file created successfully!');
  console.log('📁 Location:', envPath);
  console.log('');
  console.log('🔑 API Credentials added:');
  console.log('   KRAKEN_API_KEY: idCrybGHT4u/e7IbbzYntGyILzHhbMr2qwX3Mj/ftYNwGR6JaJwiYZha');
  console.log('   KRAKEN_API_SECRET: V/C1PdkS1uASJwKCR4ivgtg+iWRNzQ9gsgvm5VF3qlD25iqbtf5+/SQRg4yh7xyS82npIHBkkKKSPqRF212DjQ==');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Run: node verify-kraken-setup.js');
  console.log('   2. If successful, visit: http://localhost:3003/production');
  console.log('   3. Click "Start Production Trading" for real money trading!');
  
} catch (error) {
  console.log('❌ Error creating .env file:', error.message);
  console.log('');
  console.log('📋 Manual setup required:');
  console.log('   1. Create a file named ".env" in the project root');
  console.log('   2. Copy the content above into the file');
  console.log('   3. Save the file');
} 