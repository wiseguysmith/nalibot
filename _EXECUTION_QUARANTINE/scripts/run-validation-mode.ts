/**
 * Validation Mode Runner
 * 
 * VALIDATION MODE: Runs SIM + SHADOW modes in parallel for formal validation.
 * 
 * This script:
 * - Runs SIM mode (paper trading with fake capital)
 * - Runs SHADOW mode (simulated execution + real market observation)
 * - Both modes run simultaneously
 * - Tracks validation progress
 * - Generates reports
 * 
 * Requirements:
 * - Shadow trades ≥ 500
 * - Runtime ≥ 100 active trading days
 * - Confidence score ≥ 90
 * 
 * Real capital: ❌ NOT allowed during validation
 */

import * as dotenv from 'dotenv';
import { GovernanceSystem } from '../core/governance_integration';
import { SimulatedExecutionAdapter } from '../core/adapters/simulatedExecutionAdapter';
import { ShadowExecutionTracker } from '../core/shadow/shadow_execution_tracker';
import { CoinbaseMarketDataService } from '../src/services/coinbaseMarketDataService';
import { RegimeCoverageTracker } from '../core/confidence/regime_coverage_tracker';
import { StrategyConfidenceAnalyzer } from '../core/confidence/strategy_confidence_analyzer';
import { ConfidenceTrendTracker } from '../core/confidence/confidence_trend_tracker';
import { ConfidenceReportGenerator } from '../core/confidence/confidence_report';
import { RuntimeTracker } from '../core/validation/runtime_tracker';
import { ConfidenceGate } from '../core/validation/confidence_gate';

dotenv.config();

interface ValidationConfig {
  simInitialCapital: number;
  shadowPairs: string[];
  strategies: string[];
  tradeIntervalMs: number;
  reportIntervalHours: number;
  maxRuntimeDays: number;
}

/**
 * Load configuration
 */
function loadConfig(): ValidationConfig {
  return {
    simInitialCapital: parseFloat(process.env.PAPER_TRADING_INITIAL_CAPITAL || '100'),
    shadowPairs: (process.env.CONFIDENCE_TRADING_PAIRS || 'BTC/USD,ETH/USD').split(',').map(p => p.trim()),
    strategies: (process.env.CONFIDENCE_STRATEGIES || 'momentum,mean_reversion,trend_following,volatility,statistical_arb').split(',').map(s => s.trim()),
    tradeIntervalMs: parseInt(process.env.CONFIDENCE_TRADE_INTERVAL_MS || '60000'), // 1 minute default
    reportIntervalHours: parseInt(process.env.CONFIDENCE_REPORT_INTERVAL_HOURS || '24'), // Daily reports
    maxRuntimeDays: parseInt(process.env.CONFIDENCE_MAX_RUNTIME_DAYS || '30') // Max 30 days
  };
}

/**
 * Generate a trade request
 */
function generateTradeRequest(
  pair: string,
  strategy: string,
  currentPrice: number
): any {
  const action = Math.random() > 0.5 ? 'buy' : 'sell';
  const amount = Math.random() * 0.01 + 0.001; // Small amounts for validation
  const price = currentPrice * (1 + (Math.random() - 0.5) * 0.001); // Small price variation
  
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
 * Run SIM mode (paper trading)
 */
async function runSimMode(
  governance: GovernanceSystem,
  adapter: SimulatedExecutionAdapter,
  config: ValidationConfig
): Promise<void> {
  console.log('[VALIDATION] Starting SIM mode (paper trading)...');
  
  // SIM mode runs independently
  // In a real implementation, this would be a separate process or thread
  // For now, we'll simulate it by running trades in SIMULATION mode
  
  const simInterval = setInterval(async () => {
    try {
      const pair = config.shadowPairs[Math.floor(Math.random() * config.shadowPairs.length)];
      const strategy = config.strategies[Math.floor(Math.random() * config.strategies.length)];
      
      const marketData = await adapter.getTicker(pair);
      if (!marketData || !marketData.price) {
        return;
      }
      
      const request = generateTradeRequest(pair, strategy, marketData.price);
      await governance.executionManager.executeTrade(request);
      
      console.log(`[SIM] Executed ${request.action} ${request.amount} ${pair} @ ${request.price}`);
    } catch (error: any) {
      console.error('[SIM] Error:', error.message);
    }
  }, config.tradeIntervalMs * 2); // Run SIM trades at half frequency
  
  // Keep running
  process.on('SIGINT', () => {
    clearInterval(simInterval);
    console.log('[SIM] Stopped');
  });
}

/**
 * Run SHADOW mode (simulated execution + real market observation)
 */
async function runShadowMode(
  governance: GovernanceSystem,
  adapter: SimulatedExecutionAdapter,
  shadowTracker: ShadowExecutionTracker,
  coverageTracker: RegimeCoverageTracker,
  runtimeTracker: RuntimeTracker,
  config: ValidationConfig
): Promise<void> {
  console.log('[VALIDATION] Starting SHADOW mode...');
  
  const shadowInterval = setInterval(async () => {
    try {
      const pair = config.shadowPairs[Math.floor(Math.random() * config.shadowPairs.length)];
      const strategy = config.strategies[Math.floor(Math.random() * config.strategies.length)];
      
      const marketData = await adapter.getTicker(pair);
      if (!marketData || !marketData.price) {
        return;
      }
      
      // Update price history for regime detection
      if (governance.regimeGate) {
        governance.regimeGate.updatePriceHistory(pair, marketData.price, new Date());
      }
      
      const request = generateTradeRequest(pair, strategy, marketData.price);
      
      // Execute in SHADOW mode
      const result = await governance.executionManager.executeTrade(request);
      
      // Get regime information
      let regime: any = undefined;
      let regimeConfidence: number | undefined = undefined;
      if (governance.regimeGate) {
        const regimeResult = governance.regimeGate.getCurrentRegime(pair);
        if (regimeResult) {
          regime = regimeResult.regime;
          regimeConfidence = regimeResult.confidence;
        }
      }
      
      // Register with coverage tracker
      setTimeout(async () => {
        const records = shadowTracker.getAllShadowRecords();
        if (records.length > 0) {
          const latestRecord = records[records.length - 1];
          const trackingId = `SHADOW_${latestRecord.decisionTimestamp.getTime()}_${latestRecord.request.pair}_${latestRecord.request.strategy}`;
          const recordRegime = latestRecord.regime || regime;
          if (recordRegime) {
            coverageTracker.registerTrade(trackingId, recordRegime, latestRecord);
          }
        }
      }, 1000);
      
      console.log(`[SHADOW] Executed ${request.action} ${request.amount} ${pair} @ ${request.price}`);
    } catch (error: any) {
      console.error('[SHADOW] Error:', error.message);
    }
  }, config.tradeIntervalMs);
  
  // Keep running
  process.on('SIGINT', () => {
    clearInterval(shadowInterval);
    console.log('[SHADOW] Stopped');
  });
}

/**
 * Main validation runner
 */
async function runValidationMode() {
  console.log('========================================');
  console.log('VALIDATION MODE: SIM + SHADOW');
  console.log('========================================\n');
  
  const config = loadConfig();
  const startTime = new Date();
  
  // Initialize market data service
  const marketDataService = new CoinbaseMarketDataService();
  await marketDataService.initialize();
  console.log('[VALIDATION] Market data service initialized\n');
  
  // Initialize shadow tracker
  const shadowTracker = new ShadowExecutionTracker({
    marketDataService,
    observationWindowMs: 60000 // 1 minute observation window
  });
  
  // Initialize confidence components
  const coverageTracker = new RegimeCoverageTracker(167); // 500 / 3 regimes
  const confidenceAnalyzer = new StrategyConfidenceAnalyzer();
  const trendTracker = new ConfidenceTrendTracker();
  const reportGenerator = new ConfidenceReportGenerator();
  const runtimeTracker = new RuntimeTracker(startTime);
  
  // Initialize SIM mode governance (SIMULATION execution mode)
  const simAdapter = new SimulatedExecutionAdapter(marketDataService);
  const simGovernance = new GovernanceSystem({
    initialMode: 'AGGRESSIVE',
    initialCapital: config.simInitialCapital,
    exchangeClient: simAdapter,
    executionMode: 'SIMULATION',
    enableObservability: true,
    enableProductionHardening: true
  });
  
  // Initialize SHADOW mode governance (SHADOW execution mode)
  const shadowAdapter = new SimulatedExecutionAdapter(marketDataService);
  const shadowGovernance = new GovernanceSystem({
    initialMode: 'AGGRESSIVE',
    initialCapital: 0, // No capital in shadow mode
    exchangeClient: shadowAdapter,
    executionMode: 'SHADOW',
    shadowTracker,
    enableObservability: true,
    enableProductionHardening: true
  });
  
  // Initialize confidence gate
  const confidenceGate = new ConfidenceGate(
    coverageTracker,
    confidenceAnalyzer,
    shadowTracker,
    runtimeTracker,
    undefined, // Use defaults
    shadowGovernance.observabilityHooks
  );
  
  // Update shadow governance execution manager with runtime tracker
  (shadowGovernance.executionManager as any).runtimeTracker = runtimeTracker;
  
  console.log('[VALIDATION] Starting SIM + SHADOW modes in parallel...\n');
  
  // Start both modes
  await Promise.all([
    runSimMode(simGovernance, simAdapter, config),
    runShadowMode(shadowGovernance, shadowAdapter, shadowTracker, coverageTracker, runtimeTracker, config)
  ]);
  
  // Status reporting
  const statusInterval = setInterval(() => {
    const coverage = coverageTracker.getCoverageSummary();
    const runtimeDays = runtimeTracker.getActiveTradingDays();
    const allRecords = shadowTracker.getAllShadowRecords();
    const regimeMap = new Map<string, any>();
    for (const record of allRecords) {
      if (record.regime) {
        const trackingId = `SHADOW_${record.decisionTimestamp.getTime()}_${record.request.pair}_${record.request.strategy}`;
        regimeMap.set(trackingId, record.regime);
      }
    }
    const confidence = confidenceAnalyzer.analyzeConfidence(allRecords, regimeMap);
    const gateCheck = confidenceGate.getValidationStatus();
    
    console.log('\n========================================');
    console.log('VALIDATION STATUS');
    console.log('========================================');
    console.log(`Shadow Trades: ${coverage.totalTrades} / ${confidenceGate['requirements'].minimumShadowTrades}`);
    console.log(`Runtime Days: ${runtimeDays.toFixed(1)} / ${confidenceGate['requirements'].minimumRuntimeDays}`);
    console.log(`Confidence Score: ${confidence.overallConfidenceScore.toFixed(1)}% / ${confidenceGate['requirements'].minimumConfidenceScore}%`);
    console.log(`Regimes Covered: ${coverage.allRegimesCovered ? '✅' : '❌'}`);
    console.log(`Unsafe Combinations: ${confidence.unsafeCombinations.length}`);
    console.log(`REAL Execution Allowed: ${gateCheck.allowed ? '✅ YES' : '❌ NO'}`);
    if (!gateCheck.allowed) {
      console.log(`Blocking Reason: ${gateCheck.reason}`);
    }
    console.log('========================================\n');
    
    // Check if validation complete
    if (gateCheck.allowed) {
      console.log('✅ VALIDATION COMPLETE - All requirements met!');
      clearInterval(statusInterval);
      process.exit(0);
    }
  }, 60000); // Every minute
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n[VALIDATION] Shutting down...');
    clearInterval(statusInterval);
    
    // Generate final report
    const coverage = coverageTracker.getCoverageSummary();
    const allRecords = shadowTracker.getAllShadowRecords();
    const regimeMap = new Map<string, any>();
    for (const record of allRecords) {
      if (record.regime) {
        const trackingId = `SHADOW_${record.decisionTimestamp.getTime()}_${record.request.pair}_${record.request.strategy}`;
        regimeMap.set(trackingId, record.regime);
      }
    }
    
    await reportGenerator.generateReport(
      coverageTracker,
      confidenceAnalyzer,
      trendTracker,
      shadowTracker,
      regimeMap,
      startTime,
      new Date()
    );
    
    process.exit(0);
  });
}

// Run validation mode
runValidationMode().catch((error) => {
  console.error('[VALIDATION] Fatal error:', error);
  process.exit(1);
});
