#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Creating .env file...');
console.log('================================');

const envContent = `# ========================================
# AI Trading Bot Environment Variables
# ========================================

# ========================================
# KRAKEN API CREDENTIALS (REQUIRED)
# ========================================
# Get these from: https://www.kraken.com/u/settings/api
# Make sure to enable: Query Funds, Query Orders, Add & Cancel Orders
KRAKEN_API_KEY=your_kraken_api_key_here
KRAKEN_API_SECRET=your_kraken_api_secret_here

# ========================================
# KUCOIN API CREDENTIALS (ALTERNATIVE)
# ========================================
# Get these from: https://www.kucoin.com/ucenter/apikey
KUCOIN_API_KEY=your_kucoin_api_key_here
KUCOIN_SECRET_KEY=your_kucoin_secret_key_here
KUCOIN_PASSPHRASE=your_kucoin_passphrase_here

# ========================================
# COINBASE ADVANCED TRADE JWT (ECDSA) CREDENTIALS (ALTERNATIVE)
# ========================================
# Get these from: https://portal.cdp.coinbase.com/
# Coinbase Advanced Trade uses JWT authentication with ECDSA keys
# IMPORTANT: 
#   - Private key is shown ONLY ONCE at creation - save it securely
#   - If lost, you must rotate/regenerate the key
#   - No passphrase exists for JWT authentication (unlike legacy HMAC)
#   - Key ID format: organizations/{org-id}/apiKeys/{key-id}
COINBASE_JWT_KEY_ID=your_key_id_here
COINBASE_JWT_PRIVATE_KEY=your_private_key_here

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
`;

try {
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('📝 Please edit the .env file with your actual API credentials');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
