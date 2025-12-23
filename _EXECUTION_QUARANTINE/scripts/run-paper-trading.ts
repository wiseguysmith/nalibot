/**
 * Paper Trading Script
 * 
 * PHASE 8: High-Fidelity Simulation & Paper Trading
 * 
 * This script runs the full trading system in simulation mode:
 * - Uses REAL market data from exchanges (live prices)
 * - Uses SIMULATED execution (no real orders placed)
 * - Full governance pipeline executes
 * - Perfect for testing strategies safely before going live
 * 
 * As your CTO, I'm showing you how to create a production-ready paper trading system
 * that mirrors real trading as closely as possible without risking capital.
 */

import { GovernanceSystem } from '../core/governance_integration';
import { SimulatedExecutionAdapter } from '../core/adapters/simulatedExecutionAdapter';
import { MarketDataService } from '../src/services/marketDataService';
import { ExchangeType } from '../src/services/websocketPriceFeed';
import { LiveTradingEngine } from '../src/services/liveTradingEngine';
import { DEFAULT_SIMULATION_CONFIG } from '../core/simulation/simulation_config';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Paper Trading Configuration
 * 
 * These values can be overridden via environment variables
 */
interface PaperTradingConfig {
  initialCapital: number;
  tradingPairs: string[];
  simulationLatencyMs: number;
  simulationFeesMaker: number;
  simulationFeesTaker: number;
  exchange: ExchangeType;
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): PaperTradingConfig {
  const tradingPairsEnv = process.env.PAPER_TRADING_PAIRS || 'BTC/USD,ETH/USD';
  const tradingPairs = tradingPairsEnv.split(',').map(p => p.trim());

  // Determine exchange from available API keys
  let exchange: ExchangeType = ExchangeType.KRAKEN;
  if (process.env.KUCOIN_API_KEY) {
    exchange = ExchangeType.KUCOIN;
  } else if (process.env.KRAKEN_API_KEY) {
    exchange = ExchangeType.KRAKEN;
  }

  return {
    initialCapital: parseFloat(process.env.PAPER_TRADING_INITIAL_CAPITAL || '100'),
    tradingPairs,
    simulationLatencyMs: parseInt(process.env.SIMULATION_LATENCY_MS || '100'),
    simulationFeesMaker: parseFloat(process.env.SIMULATION_FEES_MAKER || '0.001'),
    simulationFeesTaker: parseFloat(process.env.SIMULATION_FEES_TAKER || '0.002'),
    exchange
  };
}

/**
 * Main paper trading function
 */
async function runPaperTrading() {
  console.log('\n🎯 ========================================');
  console.log('📊 PAPER TRADING MODE');
  console.log('🎯 ========================================\n');
  console.log('⚠️  IMPORTANT: This is SIMULATION mode');
  console.log('   - Real market data will be used');
  console.log('   - NO real orders will be placed');
  console.log('   - Perfect for testing strategies safely\n');

  const config = loadConfig();

  console.log('📋 Configuration:');
  console.log(`   Initial Capital: $${config.initialCapital.toFixed(2)}`);
  console.log(`   Trading Pairs: ${config.tradingPairs.join(', ')}`);
  console.log(`   Exchange: ${config.exchange}`);
  console.log(`   Simulation Latency: ${config.simulationLatencyMs}ms`);
  console.log(`   Maker Fee: ${(config.simulationFeesMaker * 100).toFixed(2)}%`);
  console.log(`   Taker Fee: ${(config.simulationFeesTaker * 100).toFixed(2)}%\n`);

  try {
    // Step 1: Initialize Market Data Service (REAL market data)
    console.log('📡 Step 1: Initializing Market Data Service...');
    const marketDataService = new MarketDataService(config.exchange, true);
    
    // Start market data service BEFORE creating adapter (so adapter can access cached data)
    console.log('   Starting market data feed...');
    await marketDataService.start(config.tradingPairs);
    
    // Wait a moment for initial data to populate
    console.log('   Waiting for initial market data...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Market Data Service initialized and started\n');

    // Step 2: Create Simulated Execution Adapter
    console.log('🎲 Step 2: Creating Simulated Execution Adapter...');
    const simulatedAdapter = new SimulatedExecutionAdapter(
      {
        fixedLatencyMs: config.simulationLatencyMs,
        maxLiquidityPctPerFill: DEFAULT_SIMULATION_CONFIG.maxLiquidityPctPerFill,
        feeSchedule: {
          maker: config.simulationFeesMaker,
          taker: config.simulationFeesTaker
        },
        fundingRateHandling: DEFAULT_SIMULATION_CONFIG.fundingRateHandling,
        slippageModel: DEFAULT_SIMULATION_CONFIG.slippageModel
      },
      marketDataService // Pass market data service for real prices
    );
    console.log('✅ Simulated Execution Adapter created\n');

    // Step 3: Initialize Governance System in SIMULATION mode
    console.log('🛡️  Step 3: Initializing Governance System (SIMULATION mode)...');
    const governance = new GovernanceSystem({
      initialMode: 'AGGRESSIVE', // Allow trading in simulation mode
      initialCapital: config.initialCapital,
      exchangeClient: simulatedAdapter,
      executionMode: 'SIMULATION', // CRITICAL: This enables simulation mode
      enableRegimeGovernance: true,
      enableCapitalGovernance: true,
      enableObservability: true,
      enableProductionHardening: true
    });
    console.log('✅ Governance System initialized');
    console.log(`   Execution Mode: ${governance.executionManager.getExecutionMode()}\n`);

    // Step 4: Initialize Live Trading Engine
    console.log('🚀 Step 4: Initializing Live Trading Engine...');
    
    // Get API credentials (only needed for market data, not execution)
    const apiKey = process.env.KRAKEN_API_KEY || process.env.KUCOIN_API_KEY || '';
    const apiSecret = process.env.KRAKEN_API_SECRET || process.env.KUCOIN_SECRET_KEY || '';

    if (!apiKey || !apiSecret) {
      console.error('\n❌ API credentials required for market data!');
      console.error('   Paper trading uses REAL market data but SIMULATED execution.');
      console.error('   Please set one of the following in your .env file:');
      console.error('   - KRAKEN_API_KEY and KRAKEN_API_SECRET');
      console.error('   - KUCOIN_API_KEY and KUCOIN_SECRET_KEY');
      console.error('\n   Note: These are only used for reading market data, not executing trades.\n');
      throw new Error('API credentials required for market data');
    }
    
    console.log(`   Using ${process.env.KRAKEN_API_KEY ? 'Kraken' : 'KuCoin'} API for market data`);

    const tradingEngine = new LiveTradingEngine({
      apiKey,
      apiSecret,
      sandbox: false, // Use real market data (but simulated execution)
      maxPositionSize: config.initialCapital * 0.2, // 20% max per position
      maxDailyLoss: config.initialCapital * 0.25, // 25% max daily loss
      stopLossPercent: 3, // 3% stop loss
      takeProfitPercent: 6, // 6% take profit
      tradingPairs: config.tradingPairs,
      executionManager: governance.executionManager,
      regimeGate: governance.regimeGate || null,
      capitalGate: governance.capitalGate || null
    });
    console.log('✅ Live Trading Engine initialized\n');

    // Step 5: Initialize trading engine
    console.log('⚙️  Step 5: Initializing trading engine...');
    const initialized = await tradingEngine.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize trading engine');
    }
    console.log('✅ Trading engine initialized\n');

    // Step 6: Set up graceful shutdown
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n\n🛑 Received ${signal}, shutting down gracefully...\n`);
      
      try {
        // Stop trading engine
        await tradingEngine.stop();
        console.log('✅ Trading engine stopped');

        // Stop market data service
        marketDataService.stop();
        console.log('✅ Market data service stopped');

        // Print final statistics
        console.log('\n📊 Final Statistics:');
        const executionHistory = governance.executionManager.getExecutionHistory();
        const simulatedTrades = executionHistory.filter(e => e.executionType === 'SIMULATED');
        console.log(`   Total Simulated Trades: ${simulatedTrades.length}`);
        console.log(`   Execution Mode: ${governance.executionManager.getExecutionMode()}`);

        if (governance.eventLog) {
          const events = governance.eventLog.getAllEvents();
          const tradeEvents = events.filter(e => e.eventType === 'TRADE_EXECUTED');
          console.log(`   Trade Events Logged: ${tradeEvents.length}`);
        }

        console.log('\n✅ Paper trading session completed successfully!');
        console.log('💡 Remember: All trades were SIMULATED - no real orders were placed\n');

      } catch (error: any) {
        console.error('❌ Error during shutdown:', error.message);
      }

      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Step 7: Start trading
    console.log('🚀 Step 6: Starting paper trading...\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 PAPER TRADING ACTIVE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   Mode: SIMULATION (no real orders)');
    console.log('   Market Data: REAL (live prices)');
    console.log('   Execution: SIMULATED (fake capital)');
    console.log('   Press Ctrl+C to stop\n');

    await tradingEngine.start();

    // Keep the process running
    console.log('✅ Paper trading is now running...');
    console.log('   Monitoring pairs:', config.tradingPairs.join(', '));
    console.log('   Waiting for trading signals...\n');

    // Log periodic status updates
    const statusInterval = setInterval(() => {
      const executionHistory = governance.executionManager.getExecutionHistory();
      const simulatedTrades = executionHistory.filter(e => e.executionType === 'SIMULATED');
      
      console.log(`\n[STATUS] Simulated trades executed: ${simulatedTrades.length}`);
      console.log(`[STATUS] System mode: ${governance.modeController.getMode()}`);
      console.log(`[STATUS] Risk state: ${governance.riskGovernor.getRiskState()}`);
    }, 60000); // Every minute

    // Clean up interval on shutdown
    process.on('SIGINT', () => clearInterval(statusInterval));
    process.on('SIGTERM', () => clearInterval(statusInterval));

  } catch (error: any) {
    console.error('\n❌ Paper trading failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run paper trading
if (require.main === module) {
  runPaperTrading().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runPaperTrading };
