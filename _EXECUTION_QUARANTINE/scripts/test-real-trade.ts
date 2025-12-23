/**
 * Real Trade Test Script
 * 
 * ⚠️ CRITICAL: This script executes REAL trades on Kraken.
 * 
 * ENVIRONMENT GUARDS:
 * - Cannot run in production environment
 * - Requires explicit --allow-live-trade flag
 * - Defaults to OBSERVE_ONLY mode
 * 
 * GOVERNANCE:
 * - All trades route through ExecutionManager
 * - CapitalGate → RegimeGate → PermissionGate → RiskGovernor → ExecutionManager
 * - No direct adapter calls
 */

import { GovernanceSystem, createTradeRequest } from '../core/governance_integration';
import { KrakenAdapter } from '../core/adapters/krakenAdapter';
require('dotenv').config();

// STEP 3: Environment Guards (NON-NEGOTIABLE)
if (process.env.NODE_ENV === 'production') {
  throw new Error('❌ CRITICAL: test-real-trade cannot run in production environment');
}

// Check for explicit flag
const allowLiveTrade = process.argv.includes('--allow-live-trade');
if (!allowLiveTrade) {
  console.warn('⚠️  WARNING: This script executes REAL trades.');
  console.warn('⚠️  To proceed, run with: --allow-live-trade flag');
  console.warn('⚠️  Defaulting to OBSERVE_ONLY mode (no capital deployed)');
}

/**
 * Execute micro-trade through governance
 * 
 * STEP 1: Refactored to use ExecutionManager instead of direct adapter calls
 */
async function executeMicroTrade(): Promise<void> {
  try {
    console.log('🚀 Starting micro-trade validation with governance...');
    
    // Check environment variables
    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_SECRET) {
      throw new Error('Missing Kraken API credentials in .env file');
    }

    // Initialize governance system
    // Default to OBSERVE_ONLY unless --allow-live-trade flag is present
    const initialMode = allowLiveTrade ? 'AGGRESSIVE' : 'OBSERVE_ONLY';
    
    console.log(`📊 Initializing governance system in ${initialMode} mode...`);
    
    // Initialize exchange adapter (for ExecutionManager)
    const krakenAdapter = new KrakenAdapter(
      process.env.KRAKEN_API_KEY,
      process.env.KRAKEN_API_SECRET
    );

    // Initialize governance system with all phases enabled
    const governance = new GovernanceSystem({
      initialMode,
      initialCapital: 1000,
      exchangeClient: krakenAdapter,
      enableRegimeGovernance: true,
      enableCapitalGovernance: true
    });

    console.log('✅ Governance system initialized');
    console.log(`   Mode: ${governance.modeController.getMode()}`);
    console.log(`   Risk State: ${governance.riskGovernor.getRiskState()}`);
    console.log(`   Regime Governance: ${governance.regimeGate !== null}`);
    console.log(`   Capital Governance: ${governance.capitalGate !== null}`);

    // Test 1: Check balance (read-only, no governance needed)
    console.log('');
    console.log('📊 Checking account balance...');
    const balance = await krakenAdapter.getBalance();
    console.log('Balance result:', balance);

    if (balance.error && balance.error.length > 0) {
      throw new Error(`Balance check failed: ${balance.error.join(', ')}`);
    }

    // Test 2: Get current BTC price (read-only)
    console.log('');
    console.log('💰 Getting current BTC price...');
    const ticker = await krakenAdapter.getTickerInformation(['XBTUSD']);
    console.log('Ticker result:', ticker);

    if (ticker.error && ticker.error.length > 0) {
      throw new Error(`Ticker check failed: ${ticker.error.join(', ')}`);
    }

    // Test 3: Execute micro-trade through governance
    const btcPrice = parseFloat(ticker.result.XXBTZUSD.c[0]);
    const microAmount = 0.0001; // ~$5 worth of BTC
    const estimatedCost = btcPrice * microAmount;

    console.log('');
    console.log(`💸 Estimated cost: $${estimatedCost.toFixed(2)}`);

    // Check if we have enough balance
    const usdBalance = parseFloat(balance.result.ZUSD || '0');
    if (usdBalance < estimatedCost) {
      console.log(`⚠️  Insufficient USD balance. Need $${estimatedCost.toFixed(2)}, have $${usdBalance.toFixed(2)}`);
      console.log('💰 Please add funds to test real trading');
      return;
    }

    console.log('✅ Sufficient balance, proceeding with micro-trade...');

    // STEP 1: Create TradeRequest (exactly like production flow)
    const tradeRequest = createTradeRequest({
      strategy: 'test_real_trade', // Strategy ID
      pair: 'XBTUSD', // Symbol
      action: 'buy',
      amount: microAmount, // Size
      price: btcPrice
    });

    console.log('');
    console.log('📈 Executing micro-trade through governance...');
    console.log(`   Strategy: ${tradeRequest.strategy}`);
    console.log(`   Pair: ${tradeRequest.pair}`);
    console.log(`   Action: ${tradeRequest.action}`);
    console.log(`   Amount: ${tradeRequest.amount}`);
    console.log(`   Price: $${tradeRequest.price.toFixed(2)}`);
    console.log(`   Estimated Value: $${tradeRequest.estimatedValue.toFixed(2)}`);

    // STEP 1: Execute through ExecutionManager (governance enforced)
    // This routes through: CapitalGate → RegimeGate → PermissionGate → RiskGovernor → ExecutionManager
    const result = await governance.executeTradeWithRegimeCheck(
      tradeRequest,
      'XBTUSD'
    );

    console.log('');
    console.log('📊 Trade execution result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Order ID: ${result.orderId || 'N/A'}`);

    // Check for governance blocks
    if (result.capitalBlocked) {
      console.log(`   ⚠️  Blocked by Capital Gate: ${result.capitalReason}`);
    }
    if (result.regimeBlocked) {
      console.log(`   ⚠️  Blocked by Regime Gate: ${result.regimeReason}`);
    }

    if (!result.success) {
      console.log('');
      console.log('❌ Trade execution failed or was blocked by governance');
      console.log('   This is expected in OBSERVE_ONLY mode');
      console.log('   To execute real trades, run with --allow-live-trade flag');
      return;
    }

    console.log('');
    console.log('✅ Micro-trade executed successfully through governance!');
    console.log(`   Order ID: ${result.orderId}`);

    // Test 4: Check order status (if order was executed)
    if (result.orderId) {
      console.log('');
      console.log('🔍 Checking order status...');
      const orderStatus = await krakenAdapter.getOrderStatus(result.orderId);
      console.log('Order status:', orderStatus);
    }

  } catch (error: any) {
    console.error('❌ Micro-trade failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

/**
 * Test Kraken connection (read-only)
 */
async function testKrakenConnection(): Promise<boolean> {
  try {
    console.log('🔗 Testing Kraken API connection...');

    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_SECRET) {
      throw new Error('Missing Kraken API credentials');
    }

    const kraken = new KrakenAdapter(
      process.env.KRAKEN_API_KEY,
      process.env.KRAKEN_API_SECRET
    );

    // Test public endpoints
    console.log('📊 Testing public endpoints...');
    const pairs = await kraken.getTradablePairs();
    console.log('Tradable pairs count:', Object.keys(pairs.result || {}).length);

    // Test private endpoints
    console.log('🔐 Testing private endpoints...');
    const balance = await kraken.getBalance();
    console.log('Balance check successful:', !balance.error);

    console.log('✅ Kraken API connection test passed!');
    return true;

  } catch (error: any) {
    console.error('❌ Kraken API connection test failed:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log('🤖 AutoBread Real Trading Validation (Governance-Enforced)');
    console.log('==========================================================');
    console.log('');

    // Check environment variables
    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_SECRET) {
      console.error('❌ Missing Kraken API credentials in .env file');
      console.log('Please add:');
      console.log('KRAKEN_API_KEY=your_api_key');
      console.log('KRAKEN_API_SECRET=your_api_secret');
      return;
    }

    // Test connection first
    const connectionOk = await testKrakenConnection();
    if (!connectionOk) {
      console.error('❌ Cannot proceed without valid API connection');
      return;
    }

    // Execute micro-trade through governance
    await executeMicroTrade();

    console.log('');
    console.log('🎉 Real trading validation completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the trade results above');
    console.log('2. Check your Kraken account for the executed trade (if in AGGRESSIVE mode)');
    console.log('3. Verify governance blocks worked correctly');
    console.log('');
    console.log('⚠️  REMINDER: All trades now route through governance');
    console.log('   - CapitalGate checks capital allocation');
    console.log('   - RegimeGate checks regime eligibility');
    console.log('   - PermissionGate checks mode and risk');
    console.log('   - RiskGovernor approves/denies trades');
    console.log('   - ExecutionManager executes trades');

  } catch (error: any) {
    console.error('💥 Validation failed:', error.message);
    console.log('Please check your API credentials and try again');
  }
}

// Run the test
if (require.main === module) {
  main();
}

export { executeMicroTrade, testKrakenConnection };

