#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🚀 AutoBread Production Trading Setup');
console.log('=====================================');
console.log('This script will help you configure live trading with Kraken API');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupProduction() {
  try {
    console.log('📋 Step 1: Kraken API Configuration');
    console.log('-----------------------------------');
    console.log('You need to create API keys at: https://www.kraken.com/u/settings/api');
    console.log('Required permissions: Query Funds, Query Orders, Add & Cancel Orders');
    console.log('');

    const apiKey = await askQuestion('Enter your Kraken API Key: ');
    const apiSecret = await askQuestion('Enter your Kraken API Secret: ');

    if (!apiKey || !apiSecret) {
      console.log('❌ API credentials are required');
      process.exit(1);
    }

    console.log('');
    console.log('📋 Step 2: XRP Trading Configuration');
    console.log('-----------------------------------');
    console.log('We\'ll set up XRP trading for your $125 → $200 goal (60% profit)');
    console.log('');

    const initialBalance = await askQuestion('Initial balance (default: 125): ') || '125';
    const targetProfit = await askQuestion('Target profit (default: 75): ') || '75';
    const maxDrawdown = await askQuestion('Max drawdown % (default: 20): ') || '20';
    const riskPerTrade = await askQuestion('Risk per trade % (default: 8): ') || '8';

    console.log('');
    console.log('📋 Step 3: XRP Trading Pairs');
    console.log('----------------------------');
    console.log('Available XRP pairs: XRP/USD, XRP/USDT');
    const tradingPairs = await askQuestion('Trading pairs (comma-separated, default: XRP/USD,XRP/USDT): ') || 'XRP/USD,XRP/USDT';

    console.log('');
    console.log('📋 Step 4: Safety Confirmation');
    console.log('-------------------------------');
    console.log('⚠️  IMPORTANT SAFETY WARNINGS:');
    console.log('• This is LIVE TRADING with REAL MONEY');
    console.log('• Only trade with funds you can afford to lose');
    console.log('• Monitor the system carefully');
    console.log('• Use emergency stop if needed');
    console.log('');

    const confirm = await askQuestion('Type "I UNDERSTAND" to confirm you understand the risks: ');
    
    if (confirm !== 'I UNDERSTAND') {
      console.log('❌ Safety confirmation required');
      process.exit(1);
    }

    // Create .env file
    const envContent = `# ========================================
# AI Trading Bot - PRODUCTION ENVIRONMENT
# ========================================
# LIVE TRADING CONFIGURATION - $${targetProfit} GOAL
# ========================================

# ========================================
# KRAKEN API CREDENTIALS
# ========================================
KRAKEN_API_KEY=${apiKey}
KRAKEN_API_SECRET=${apiSecret}

# ========================================
# PRODUCTION TRADING CONFIGURATION
# ========================================
INITIAL_BALANCE=${initialBalance}
TARGET_PROFIT=${targetProfit}
MAX_DRAWDOWN_PERCENTAGE=${maxDrawdown}
RISK_PER_TRADE_PERCENTAGE=${riskPerTrade}
MAX_DAILY_LOSS_PERCENTAGE=10
POSITION_SIZE_PERCENTAGE=20

# ========================================
# TRADING PAIRS & STRATEGIES
# ========================================
TRADING_PAIRS=${tradingPairs}
ACTIVE_STRATEGIES=mean_reversion,arbitrage,grid_trading
MARKET_DATA_PROVIDER=kraken

# ========================================
# SAFETY & MONITORING
# ========================================
ENABLE_STOP_LOSS=true
ENABLE_TAKE_PROFIT=true
AUTO_STOP_ON_DRAWDOWN=true
TELEGRAM_NOTIFICATIONS=false
EMAIL_NOTIFICATIONS=false

# ========================================
# MACHINE LEARNING CONFIGURATION
# ========================================
ML_MODEL_ENABLED=true
ML_TRAINING_INTERVAL=24h
ML_PREDICTION_CONFIDENCE_THRESHOLD=0.7

# ========================================
# DEVELOPMENT SETTINGS
# ========================================
NODE_ENV=production
NEXT_PUBLIC_KRAKEN_API_KEY=${apiKey}
NEXT_PUBLIC_KRAKEN_API_SECRET=${apiSecret}
`;

    // Write .env file
    fs.writeFileSync('.env', envContent);
    console.log('✅ Production configuration saved to .env');

    // Test Kraken connection
    console.log('');
    console.log('🔍 Testing Kraken API connection...');
    
    const { KrakenWrapper } = require('../src/services/krakenWrapper');
    const kraken = new KrakenWrapper(apiKey, apiSecret);
    
    try {
      const balanceResponse = await kraken.getBalance();
      if (balanceResponse.error && balanceResponse.error.length > 0) {
        console.log('❌ Kraken API connection failed:', balanceResponse.error.join(', '));
        console.log('Please check your API credentials and permissions');
        process.exit(1);
      }
      
      console.log('✅ Kraken API connection successful');
      
      // Show current balance
      if (balanceResponse.result) {
        console.log('💰 Current Kraken Balance:');
        for (const [asset, amount] of Object.entries(balanceResponse.result)) {
          if (parseFloat(amount) > 0) {
            console.log(`   ${asset}: ${amount}`);
          }
        }
      }
      
    } catch (error) {
      console.log('❌ Kraken API test failed:', error.message);
      process.exit(1);
    }

    console.log('');
    console.log('🎉 Production Setup Complete!');
    console.log('=============================');
    console.log('');
    console.log('📋 XRP Trading Configuration Summary:');
    console.log(`   Initial Balance: $${initialBalance}`);
    console.log(`   Target Profit: $${targetProfit} (Goal: $${parseInt(initialBalance) + parseInt(targetProfit)})`);
    console.log(`   Max Drawdown: ${maxDrawdown}%`);
    console.log(`   Risk per Trade: ${riskPerTrade}%`);
    console.log(`   Trading Pairs: ${tradingPairs}`);
    console.log(`   Strategy: XRP-focused with volatility breakout`);
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Navigate to: http://localhost:3000/production');
    console.log('3. Review the production dashboard');
    console.log('4. Click "Start Trading" when ready');
    console.log('5. Monitor carefully and use emergency stop if needed');
    console.log('');
    console.log('⚠️  Remember: This is live trading with real money!');
    console.log('   Monitor the system carefully and be prepared to stop if needed.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupProduction(); 