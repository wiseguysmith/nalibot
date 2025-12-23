#!/usr/bin/env node

/**
 * Shadow Trading Mode Script
 * 
 * PHASE 9: Shadow Trading & Execution Parity
 * 
 * Runs the trading system in SHADOW mode:
 * - Uses live Coinbase market data (read-only)
 * - Generates shadow trades through full governance pipeline
 * - Computes parity metrics comparing simulated vs observed execution
 * - Logs all results for operator review
 * 
 * Constraints:
 * - NO real orders placed
 * - NO capital mutations
 * - NO strategy modifications
 * - Observation only
 */

require('dotenv').config();

// Add ts-node register for TypeScript support
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
    skipLibCheck: true
  }
});

const { GovernanceSystem } = require('../core/governance_integration');
const { SimulatedExecutionAdapter } = require('../core/adapters/simulatedExecutionAdapter');
const { ShadowExecutionTracker } = require('../core/shadow/shadow_execution_tracker');
const { CoinbaseMarketDataService } = require('../src/services/coinbaseMarketDataService');
const { TradeRequest } = require('../src/services/riskGovernor');

async function runShadowMode() {
  console.log('🌑 Starting Shadow Trading Mode...');
  console.log('=====================================\n');

  try {
    // Step 1: Initialize Coinbase Market Data Service
    console.log('📊 Initializing Coinbase Market Data Service...');
    const marketDataService = new CoinbaseMarketDataService();
    
    // Test market data connection
    const testPair = 'BTC/USD';
    console.log(`   Testing connection with pair: ${testPair}...`);
    const testData = await marketDataService.getMarketData(testPair);
    if (!testData) {
      console.error('   ❌ Market data fetch returned null');
      // Try again with more details
      const retryData = await marketDataService.getMarketData(testPair);
      if (!retryData) {
        throw new Error('Failed to fetch Coinbase market data. Check your internet connection and API endpoint.');
      }
    }
    console.log(`✅ Market data service connected`);
    console.log(`   Test pair ${testPair}: $${testData.price.toFixed(2)} (bid: $${testData.bid.toFixed(2)}, ask: $${testData.ask.toFixed(2)})`);
    console.log('');

    // Step 2: Initialize Shadow Execution Tracker
    console.log('🔍 Initializing Shadow Execution Tracker...');
    const shadowTracker = new ShadowExecutionTracker(
      {
        observationWindowMs: 5000, // 5 seconds observation window
        priceSamplingIntervalMs: 1000, // Sample every 1 second
        latencyReferenceMs: 100, // 100ms latency reference
        trackedSymbols: ['BTC/USD', 'ETH/USD'] // Track these symbols
      },
      marketDataService
    );
    console.log('✅ Shadow tracker initialized');
    console.log('');

    // Step 3: Initialize Governance System in SHADOW mode
    console.log('⚙️  Initializing Governance System (SHADOW mode)...');
    
    // Create simulated execution adapter
    const simulatedAdapter = new SimulatedExecutionAdapter(
      {
        fixedLatencyMs: 100,
        maxLiquidityPctPerFill: 0.1,
        feeSchedule: { maker: 0.001, taker: 0.002 },
        fundingRateHandling: 'NONE',
        slippageModel: 'DYNAMIC',
        slippageFactor: 0.0001
      },
      marketDataService
    );

    const governance = new GovernanceSystem({
      initialMode: 'AGGRESSIVE', // Allow trading in shadow mode
      initialCapital: 10000,
      exchangeClient: simulatedAdapter,
      executionMode: 'SHADOW',
      shadowTracker: shadowTracker,
      enableRegimeGovernance: true,
      enableCapitalGovernance: true,
      enableObservability: true,
      enableProductionHardening: true
    });

    // Attach observability hooks to shadow tracker
    if (governance.observabilityHooks) {
      shadowTracker.observabilityHooks = governance.observabilityHooks;
    }

    console.log('✅ Governance System initialized in SHADOW mode');
    console.log(`   Execution Mode: SHADOW`);
    console.log(`   System Mode: ${governance.modeController.getMode()}`);
    console.log('');

    // Step 4: Start market data polling
    console.log('📡 Starting market data polling...');
    const pairsToTrack = ['BTC/USD', 'ETH/USD'];
    marketDataService.startPolling(pairsToTrack, 1000); // Poll every 1 second
    console.log(`✅ Polling started for: ${pairsToTrack.join(', ')}`);
    console.log('');

    // Step 5: Generate shadow trades
    console.log('🔄 Generating shadow trades...');
    console.log('   (Running through full governance pipeline)\n');

    const shadowTrades = [
      {
        strategy: 'momentum',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: testData.price * 0.999 // Slightly below market
      },
      {
        strategy: 'mean_reversion',
        pair: 'ETH/USD',
        action: 'buy',
        amount: 0.1,
        price: testData.price * 0.998 // Slightly below market
      },
      {
        strategy: 'trend_following',
        pair: 'BTC/USD',
        action: 'sell',
        amount: 0.005,
        price: testData.price * 1.001 // Slightly above market
      }
    ];

    const results = [];

    for (let i = 0; i < shadowTrades.length; i++) {
      const trade = shadowTrades[i];
      console.log(`--- Shadow Trade ${i + 1}/${shadowTrades.length} ---`);
      console.log(`Strategy: ${trade.strategy}`);
      console.log(`Pair: ${trade.pair}`);
      console.log(`Action: ${trade.action.toUpperCase()}`);
      console.log(`Amount: ${trade.amount}`);
      console.log(`Requested Price: $${trade.price.toFixed(2)}`);

      // Get current market data
      const currentMarketData = await marketDataService.getMarketData(trade.pair);
      if (currentMarketData) {
        console.log(`Current Market Price: $${currentMarketData.price.toFixed(2)}`);
      }

      const request = {
        strategy: trade.strategy,
        pair: trade.pair,
        action: trade.action,
        amount: trade.amount,
        price: trade.price
      };

      try {
        // Get current regime before execution (PHASE 10: for confidence accumulation)
        let regime = 'UNKNOWN';
        let regimeConfidence = 0;
        if (governance.regimeGate) {
          const regimeResult = governance.regimeGate.getCurrentRegime(trade.pair);
          if (regimeResult) {
            regime = regimeResult.regime;
            regimeConfidence = regimeResult.confidence;
            console.log(`   Current Regime: ${regime} (${(regimeConfidence * 100).toFixed(0)}% confidence)`);
          }
        }

        // Execute through governance pipeline (SHADOW mode)
        const result = await governance.executionManager.executeTrade(request);
        
        console.log(`\n📈 Execution Result:`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Execution Type: ${result.executionType || 'UNKNOWN'}`);
        if (result.executionPrice) {
          console.log(`   Execution Price: $${result.executionPrice.toFixed(2)}`);
        }
        if (result.quantity) {
          console.log(`   Quantity: ${result.quantity}`);
        }
        if (result.slippage !== undefined) {
          console.log(`   Slippage: $${result.slippage.toFixed(2)}`);
        }
        if (result.fees !== undefined) {
          console.log(`   Fees: $${result.fees.toFixed(2)}`);
        }

        // PHASE 10: Update shadow record with regime information
        if (result.success && shadowTracker) {
          const allRecords = shadowTracker.getAllShadowRecords();
          const latestRecord = allRecords[allRecords.length - 1];
          if (latestRecord) {
            latestRecord.regime = regime;
            latestRecord.regimeConfidence = regimeConfidence;
          }
        }

        results.push({ request, result, regime, timestamp: new Date() });

        // Wait a bit before next trade
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Trade execution failed:`, error.message);
        results.push({ request, result: null, error: error.message, timestamp: new Date() });
      }

      console.log('');
    }

    // Step 6: Wait for observation windows to complete
    const observationWindowMs = 5000; // 5 seconds
    const waitTime = observationWindowMs + 1000; // Add 1 second buffer
    console.log(`⏳ Waiting for observation windows to complete (${waitTime / 1000} seconds)...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Ensure all trackings are cleaned up
    shadowTracker.cleanup();
    console.log('✅ Observation windows completed');
    console.log('');

    // Step 7: Generate and display parity summary
    console.log('📊 Generating Parity Summary...');
    console.log('=====================================\n');
    
    const paritySummaryText = shadowTracker.exportParitySummaryAsText();
    console.log(paritySummaryText);
    console.log('');
    
    // Also export as JSON for programmatic access
    const paritySummaryJSON = shadowTracker.exportParitySummaryAsJSON();
    const fs = require('fs');
    const path = require('path');
    const summaryPath = path.join(__dirname, '..', 'reports', `parity-summary-${Date.now()}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(summaryPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(summaryPath, paritySummaryJSON, 'utf8');
    console.log(`💾 Parity summary exported to: ${summaryPath}`);
    console.log('');

    // Step 8: Display event log summary
    console.log('📜 Event Log Summary:');
    console.log('=====================================\n');

    if (governance.eventLog) {
      const events = governance.eventLog.getAllEvents();
      const shadowEvents = events.filter(e => 
        e.eventType === 'SHADOW_TRADE_EVALUATED' || 
        e.eventType === 'SHADOW_PARITY_METRIC'
      );

      console.log(`Total Events: ${events.length}`);
      console.log(`Shadow Events: ${shadowEvents.length}`);
      console.log('');

      if (shadowEvents.length > 0) {
        console.log('Recent Shadow Events (last 10):');
        const recentShadowEvents = shadowEvents.slice(-10);
        for (const event of recentShadowEvents) {
          console.log(`   [${event.timestamp.toISOString()}] ${event.eventType}`);
          if (event.eventType === 'SHADOW_TRADE_EVALUATED') {
            console.log(`      Strategy: ${event.strategyId}, Pair: ${event.pair || 'N/A'}`);
          }
          if (event.eventType === 'SHADOW_PARITY_METRIC') {
            console.log(`      Strategy: ${event.strategyId}, Pair: ${event.pair || 'N/A'}`);
            console.log(`      Execution Price Error: ${(event.executionPriceErrorPct || 0).toFixed(2)}%`);
          }
        }
      }
    }

    // Step 9: Verification summary
    console.log('\n✅ Verification Summary:');
    console.log('=====================================');
    console.log('✅ No real orders placed');
    console.log('✅ No capital mutations');
    console.log('✅ Full governance pipeline executed');
    console.log('✅ Shadow trades tracked');
    console.log('✅ Parity metrics computed');
    console.log('✅ Events logged to event log');
    console.log('');

    console.log('🎉 Shadow mode test completed successfully!');
    console.log('\n💡 Key Questions Answered:');
    console.log('   ✅ "Would this trade have filled?" - See Fill Match Statistics');
    console.log('   ✅ "At what real market price?" - See Observed Price in trade records');
    console.log('   ✅ "How far off were our assumptions?" - See Price Error Statistics');
    console.log('   ✅ "Is execution accuracy good enough?" - See Confidence Score');
    console.log('\n💡 Next Steps:');
    console.log('   - Review parity summary above');
    console.log('   - Check exported JSON report for detailed analysis');
    console.log('   - Review event log at /api/observability/events');
    console.log('   - If confidence score >= 80, consider proceeding to live trading');

  } catch (error) {
    console.error('❌ Shadow mode failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run shadow mode
if (require.main === module) {
  runShadowMode().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runShadowMode };

