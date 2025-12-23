/**
 * Sentinel Mode Runner
 * 
 * VALIDATION MODE: Infrastructure testing with real exchange adapters.
 * 
 * Sentinel Mode Properties:
 * - Uses REAL exchange adapters (Kraken)
 * - Capital hard-capped at $50-$100
 * - Max loss = 100% (explicit)
 * - Trades are logged, observable, replayable
 * - Explicitly excluded from confidence calculations
 * - Labeled in events as: EXECUTION_TYPE = SENTINEL
 * 
 * Purpose:
 * - Verify API auth
 * - Verify order routing
 * - Verify fee accounting
 * - Verify cancel / failure handling
 * 
 * Sentinel mode is NOT proof of profitability.
 */

import * as dotenv from 'dotenv';
import { GovernanceSystem } from '../core/governance_integration';
import { KrakenAdapter } from '../core/adapters/krakenAdapter';
import { RuntimeTracker } from '../core/validation/runtime_tracker';

dotenv.config();

interface SentinelConfig {
  capitalCap: number; // Hard cap (default: 100)
  tradingPairs: string[];
  strategies: string[];
  tradeIntervalMs: number;
}

/**
 * Load configuration
 */
function loadConfig(): SentinelConfig {
  const capitalCap = parseFloat(process.env.SENTINEL_CAPITAL_CAP || '100');
  
  // Ensure cap is between $50 and $100
  const clampedCap = Math.max(50, Math.min(100, capitalCap));
  
  return {
    capitalCap: clampedCap,
    tradingPairs: (process.env.SENTINEL_TRADING_PAIRS || 'BTC/USD').split(',').map(p => p.trim()),
    strategies: (process.env.SENTINEL_STRATEGIES || 'momentum').split(',').map(s => s.trim()),
    tradeIntervalMs: parseInt(process.env.SENTINEL_TRADE_INTERVAL_MS || '300000') // 5 minutes default
  };
}

/**
 * Generate a small trade request for infrastructure testing
 */
function generateSentinelTrade(
  pair: string,
  strategy: string,
  currentPrice: number,
  capitalCap: number
): any {
  const action = Math.random() > 0.5 ? 'buy' : 'sell';
  
  // Very small trade size (1% of cap max)
  const maxTradeValue = capitalCap * 0.01;
  const amount = (maxTradeValue / currentPrice) * (0.5 + Math.random() * 0.5); // 0.5% to 1% of cap
  const price = currentPrice;
  
  return {
    pair,
    strategy,
    action,
    amount,
    price,
    estimatedValue: amount * price,
    timestamp: new Date()
  };
}

/**
 * Main sentinel runner
 */
async function runSentinelMode() {
  console.log('========================================');
  console.log('SENTINEL MODE: Infrastructure Testing');
  console.log('========================================\n');
  
  const config = loadConfig();
  const startTime = new Date();
  
  // Validate API credentials
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error(
      'SENTINEL MODE requires KRAKEN_API_KEY and KRAKEN_API_SECRET in .env file.\n' +
      'Sentinel mode uses REAL exchange adapters for infrastructure testing.'
    );
  }
  
  console.log(`[SENTINEL] Capital Cap: $${config.capitalCap}`);
  console.log(`[SENTINEL] Max Loss: 100% (explicit)\n`);
  
  // Initialize real exchange adapter
  const krakenAdapter = new KrakenAdapter(apiKey, apiSecret);
  
  // Initialize runtime tracker (for tracking active days, but sentinel trades excluded from confidence)
  const runtimeTracker = new RuntimeTracker(startTime);
  
  // Initialize governance with SENTINEL execution mode
  const governance = new GovernanceSystem({
    initialMode: 'AGGRESSIVE',
    initialCapital: config.capitalCap,
    exchangeClient: krakenAdapter,
    executionMode: 'SENTINEL',
    enableObservability: true,
    enableProductionHardening: true
  });
  
  // Update execution manager with runtime tracker and sentinel cap
  (governance.executionManager as any).runtimeTracker = runtimeTracker;
  (governance.executionManager as any).sentinelCapitalCap = config.capitalCap;
  
  console.log('[SENTINEL] Starting infrastructure testing...\n');
  console.log('⚠️  WARNING: Sentinel mode uses REAL exchange adapters.');
  console.log('⚠️  Capital is hard-capped at $' + config.capitalCap);
  console.log('⚠️  Max loss = 100% (explicit)\n');
  
  // Check current capital
  const currentCapital = governance.riskGovernor.getCurrentCapital();
  console.log(`[SENTINEL] Current Capital: $${currentCapital.toFixed(2)}\n`);
  
  if (currentCapital > config.capitalCap) {
    throw new Error(
      `Current capital ($${currentCapital.toFixed(2)}) exceeds sentinel cap ($${config.capitalCap})`
    );
  }
  
  // Sentinel trading loop
  const sentinelInterval = setInterval(async () => {
    try {
      // Check capital cap
      const currentCapital = governance.riskGovernor.getCurrentCapital();
      if (currentCapital > config.capitalCap) {
        console.error(`[SENTINEL] 🚨 Capital cap exceeded: $${currentCapital.toFixed(2)} > $${config.capitalCap}`);
        clearInterval(sentinelInterval);
        return;
      }
      
      // Check for 100% loss (max loss)
      if (currentCapital <= 0) {
        console.log('[SENTINEL] ⚠️  Max loss reached (100%). Stopping sentinel mode.');
        clearInterval(sentinelInterval);
        return;
      }
      
      const pair = config.tradingPairs[Math.floor(Math.random() * config.tradingPairs.length)];
      const strategy = config.strategies[Math.floor(Math.random() * config.strategies.length)];
      
      // Get current market price
      const ticker = await krakenAdapter.getTicker(pair);
      if (!ticker || !ticker.price) {
        console.warn(`[SENTINEL] No market data for ${pair}, skipping...`);
        return;
      }
      
      const request = generateSentinelTrade(pair, strategy, ticker.price, config.capitalCap);
      
      console.log(`[SENTINEL] Executing ${request.action} ${request.amount.toFixed(6)} ${pair} @ $${request.price.toFixed(2)}`);
      console.log(`[SENTINEL] Trade Value: $${(request.amount * request.price).toFixed(2)}`);
      console.log(`[SENTINEL] Current Capital: $${currentCapital.toFixed(2)}`);
      
      // Execute trade (will be labeled as SENTINEL)
      const result = await governance.executionManager.executeTrade(request);
      
      if (result.success) {
        console.log(`[SENTINEL] ✅ Trade executed: Order ID ${result.orderId || 'N/A'}`);
      } else {
        console.log(`[SENTINEL] ❌ Trade failed: ${result.pair}`);
      }
      
      // Record runtime (for tracking, but excluded from confidence)
      runtimeTracker.recordTradeExecution(new Date());
      
      console.log('');
    } catch (error: any) {
      console.error(`[SENTINEL] Error:`, error.message);
      
      // Check if it's a capital cap error
      if (error.message.includes('capital cap')) {
        console.log('[SENTINEL] Stopping due to capital cap violation.');
        clearInterval(sentinelInterval);
      }
    }
  }, config.tradeIntervalMs);
  
  // Status reporting
  const statusInterval = setInterval(() => {
    const currentCapital = governance.riskGovernor.getCurrentCapital();
    const runtimeDays = runtimeTracker.getActiveTradingDays();
    const capitalUsed = config.capitalCap - currentCapital;
    const lossPct = (capitalUsed / config.capitalCap) * 100;
    
    console.log('\n========================================');
    console.log('SENTINEL STATUS');
    console.log('========================================');
    console.log(`Capital Cap: $${config.capitalCap.toFixed(2)}`);
    console.log(`Current Capital: $${currentCapital.toFixed(2)}`);
    console.log(`Capital Used: $${capitalUsed.toFixed(2)} (${lossPct.toFixed(2)}%)`);
    console.log(`Active Trading Days: ${runtimeDays}`);
    console.log(`Execution Type: SENTINEL (excluded from confidence)`);
    console.log('========================================\n');
  }, 60000); // Every minute
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n[SENTINEL] Shutting down...');
    clearInterval(sentinelInterval);
    clearInterval(statusInterval);
    
    const finalCapital = governance.riskGovernor.getCurrentCapital();
    const capitalUsed = config.capitalCap - finalCapital;
    const lossPct = (capitalUsed / config.capitalCap) * 100;
    
    console.log('\n========================================');
    console.log('SENTINEL FINAL STATUS');
    console.log('========================================');
    console.log(`Initial Capital: $${config.capitalCap.toFixed(2)}`);
    console.log(`Final Capital: $${finalCapital.toFixed(2)}`);
    console.log(`Total Loss: $${capitalUsed.toFixed(2)} (${lossPct.toFixed(2)}%)`);
    console.log(`Active Trading Days: ${runtimeTracker.getActiveTradingDays()}`);
    console.log('========================================\n');
    
    console.log('⚠️  REMINDER: Sentinel mode is for infrastructure testing only.');
    console.log('⚠️  Sentinel trades are excluded from confidence calculations.');
    console.log('⚠️  Sentinel mode is NOT proof of profitability.\n');
    
    process.exit(0);
  });
}

// Run sentinel mode
runSentinelMode().catch((error) => {
  console.error('[SENTINEL] Fatal error:', error);
  process.exit(1);
});
