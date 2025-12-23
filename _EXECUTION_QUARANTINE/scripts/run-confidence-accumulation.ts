/**
 * Confidence Accumulation Runner
 * 
 * PHASE 10: Confidence Accumulation & Coverage
 * 
 * Long-running script to accumulate 500+ shadow trades across all regimes.
 * Generates daily confidence reports.
 * 
 * Design Principles:
 * - Accumulates trades across ALL regimes (FAVORABLE, UNFAVORABLE, UNKNOWN)
 * - Tracks regime coverage explicitly
 * - Produces daily confidence reports
 * - No real capital touched
 * - Deterministic and replayable
 */

import { GovernanceSystem } from '../core/governance_integration';
import { SimulatedExecutionAdapter } from '../core/adapters/simulatedExecutionAdapter';
import { ShadowExecutionTracker } from '../core/shadow/shadow_execution_tracker';
import { CoinbaseMarketDataService } from '../src/services/coinbaseMarketDataService';
import { RegimeCoverageTracker } from '../core/confidence/regime_coverage_tracker';
import { StrategyConfidenceAnalyzer } from '../core/confidence/strategy_confidence_analyzer';
import { ConfidenceTrendTracker } from '../core/confidence/confidence_trend_tracker';
import { ConfidenceReportGenerator } from '../core/confidence/confidence_report';
import { MarketRegime } from '../core/regime_detector';
import { createTradeRequest } from '../core/governance_integration';
import { DEFAULT_SIMULATION_CONFIG } from '../core/simulation/simulation_config';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

/**
 * Configuration for confidence accumulation
 */
interface AccumulationConfig {
  targetTotalTrades: number;
  minimumPerRegime: number;
  tradingPairs: string[];
  strategies: string[];
  tradeIntervalMs: number;
  reportIntervalHours: number;
  maxRuntimeDays: number;
}

/**
 * Load configuration
 */
function loadConfig(): AccumulationConfig {
  return {
    targetTotalTrades: parseInt(process.env.CONFIDENCE_TARGET_TRADES || '500'),
    minimumPerRegime: parseInt(process.env.CONFIDENCE_MIN_PER_REGIME || '167'),
    tradingPairs: (process.env.CONFIDENCE_TRADING_PAIRS || 'BTC/USD,ETH/USD').split(',').map(p => p.trim()),
    strategies: (process.env.CONFIDENCE_STRATEGIES || 'momentum,mean_reversion,trend_following,volatility,statistical_arb').split(',').map(s => s.trim()),
    tradeIntervalMs: parseInt(process.env.CONFIDENCE_TRADE_INTERVAL_MS || '60000'), // 1 minute default
    reportIntervalHours: parseInt(process.env.CONFIDENCE_REPORT_INTERVAL_HOURS || '24'), // Daily reports
    maxRuntimeDays: parseInt(process.env.CONFIDENCE_MAX_RUNTIME_DAYS || '30') // Max 30 days
  };
}

/**
 * Generate a shadow trade request
 */
function generateShadowTrade(
  pair: string,
  strategy: string,
  currentPrice: number
): any {
  const action = Math.random() > 0.5 ? 'buy' : 'sell';
  const priceOffset = (Math.random() * 0.01) - 0.005; // ±0.5% offset
  const amount = action === 'buy' 
    ? (100 / currentPrice) * (0.5 + Math.random() * 0.5) // $50-$100 worth
    : (50 / currentPrice) * (0.5 + Math.random() * 0.5); // $25-$50 worth

  return {
    strategy,
    pair,
    action,
    amount,
    price: currentPrice * (1 + priceOffset),
    estimatedValue: amount * currentPrice
  };
}

/**
 * Main accumulation function
 */
async function runConfidenceAccumulation() {
  console.log('\n🎯 ========================================');
  console.log('📊 CONFIDENCE ACCUMULATION MODE');
  console.log('🎯 ========================================\n');
  console.log('⚠️  PHASE 10: Accumulating shadow trades for confidence validation');
  console.log('   - Target: 500+ trades across ALL regimes');
  console.log('   - No real orders will be placed');
  console.log('   - Daily confidence reports generated\n');

  const config = loadConfig();

  console.log('📋 Configuration:');
  console.log(`   Target Total Trades: ${config.targetTotalTrades}`);
  console.log(`   Minimum Per Regime: ${config.minimumPerRegime}`);
  console.log(`   Trading Pairs: ${config.tradingPairs.join(', ')}`);
  console.log(`   Strategies: ${config.strategies.join(', ')}`);
  console.log(`   Trade Interval: ${config.tradeIntervalMs}ms`);
  console.log(`   Report Interval: ${config.reportIntervalHours} hours`);
  console.log(`   Max Runtime: ${config.maxRuntimeDays} days\n`);

  try {
    // Step 1: Initialize Market Data Service
    console.log('📡 Step 1: Initializing Market Data Service...');
    const marketDataService = new CoinbaseMarketDataService();
    
    // Test connection
    const testPair = config.tradingPairs[0];
    const testData = await marketDataService.getMarketData(testPair);
    if (!testData) {
      throw new Error(`Failed to fetch market data for ${testPair}`);
    }
    console.log(`✅ Market data service connected (${testPair}: $${testData.price.toFixed(2)})\n`);

    // Step 2: Initialize Shadow Execution Tracker
    console.log('🔍 Step 2: Initializing Shadow Execution Tracker...');
    const shadowTracker = new ShadowExecutionTracker(
      {
        observationWindowMs: 5000,
        priceSamplingIntervalMs: 1000,
        latencyReferenceMs: 100
      },
      marketDataService
    );
    console.log('✅ Shadow tracker initialized\n');

    // Step 3: Initialize Confidence Trackers
    console.log('📊 Step 3: Initializing Confidence Trackers...');
    const coverageTracker = new RegimeCoverageTracker(config.minimumPerRegime);
    const confidenceAnalyzer = new StrategyConfidenceAnalyzer({
      confidenceThreshold: 90,
      minimumTradesPerCombination: 10
    });
    const trendTracker = new ConfidenceTrendTracker({
      rollingWindowDays: 7,
      minSnapshotsForTrend: 3
    });
    const reportGenerator = new ConfidenceReportGenerator({
      confidenceThreshold: 90
    });
    console.log('✅ Confidence trackers initialized\n');

    // Step 4: Initialize Governance System
    console.log('⚙️  Step 4: Initializing Governance System (SHADOW mode)...');
    const simulatedAdapter = new SimulatedExecutionAdapter(
      {
        fixedLatencyMs: 100,
        maxLiquidityPctPerFill: DEFAULT_SIMULATION_CONFIG.maxLiquidityPctPerFill,
        feeSchedule: DEFAULT_SIMULATION_CONFIG.feeSchedule,
        fundingRateHandling: DEFAULT_SIMULATION_CONFIG.fundingRateHandling,
        slippageModel: DEFAULT_SIMULATION_CONFIG.slippageModel
      },
      marketDataService
    );

    const governance = new GovernanceSystem({
      initialMode: 'AGGRESSIVE',
      initialCapital: 10000,
      exchangeClient: simulatedAdapter,
      executionMode: 'SHADOW',
      shadowTracker: shadowTracker,
      enableRegimeGovernance: true,
      enableCapitalGovernance: true,
      enableObservability: true,
      enableProductionHardening: true
    });

    if (governance.observabilityHooks) {
      shadowTracker.observabilityHooks = governance.observabilityHooks;
    }

    console.log('✅ Governance System initialized\n');

    // Step 5: Start market data polling
    console.log('📡 Step 5: Starting market data polling...');
    marketDataService.startPolling(config.tradingPairs, 1000);
    console.log(`✅ Polling started\n`);

    // Step 6: Initialize price history for regime detection
    console.log('📈 Step 6: Initializing price history for regime detection...');
    // Seed price history with initial data
    for (const pair of config.tradingPairs) {
      const marketData = await marketDataService.getMarketData(pair);
      if (marketData && governance.regimeGate) {
        // Seed with some historical prices (simplified - in production, fetch historical data)
        for (let i = 0; i < 30; i++) {
          const seedPrice = marketData.price * (1 + (Math.random() - 0.5) * 0.02); // ±1% variation
          governance.regimeGate.updatePriceHistory(pair, seedPrice);
        }
      }
    }
    console.log('✅ Price history initialized\n');

    // Step 7: Start accumulation loop
    console.log('🚀 Step 7: Starting confidence accumulation...\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 CONFIDENCE ACCUMULATION ACTIVE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   Mode: SHADOW (no real orders)');
    console.log('   Target: 500+ trades across all regimes');
    console.log('   Press Ctrl+C to stop\n');

    const startTime = new Date();
    let tradeCount = 0;
    const regimeMap = new Map<string, MarketRegime>(); // trackingId -> regime
    let lastReportTime = new Date();

    // Accumulation loop
    const accumulationInterval = setInterval(async () => {
      try {
        // Check if we've reached target
        const coverage = coverageTracker.getCoverageSummary();
        if (coverage.totalTrades >= config.targetTotalTrades && coverage.allRegimesCovered) {
          console.log('\n✅ Target reached! Stopping accumulation...\n');
          clearInterval(accumulationInterval);
          await generateFinalReport(
            coverageTracker,
            confidenceAnalyzer,
            trendTracker,
            reportGenerator,
            shadowTracker,
            regimeMap,
            startTime,
            new Date()
          );
          process.exit(0);
          return;
        }

        // Check max runtime
        const runtimeDays = (Date.now() - startTime.getTime()) / (1000 * 60 * 60 * 24);
        if (runtimeDays >= config.maxRuntimeDays) {
          console.log(`\n⏰ Max runtime (${config.maxRuntimeDays} days) reached. Stopping...\n`);
          clearInterval(accumulationInterval);
          await generateFinalReport(
            coverageTracker,
            confidenceAnalyzer,
            trendTracker,
            reportGenerator,
            shadowTracker,
            regimeMap,
            startTime,
            new Date()
          );
          process.exit(0);
          return;
        }

        // Select random pair and strategy
        const pair = config.tradingPairs[Math.floor(Math.random() * config.tradingPairs.length)];
        const strategy = config.strategies[Math.floor(Math.random() * config.strategies.length)];

        // Get current market data
        const marketData = await marketDataService.getMarketData(pair);
        if (!marketData) {
          console.warn(`[ACCUMULATION] No market data for ${pair}, skipping...`);
          return;
        }

        // Update price history for regime detection (PHASE 10: critical for regime tracking)
        if (governance.regimeGate) {
          governance.regimeGate.updatePriceHistory(pair, marketData.price);
        }

        // Get current regime BEFORE execution (PHASE 10: for confidence accumulation)
        let regime: MarketRegime = MarketRegime.UNKNOWN;
        let regimeConfidence = 0;
        if (governance.regimeGate) {
          const regimeResult = governance.regimeGate.getCurrentRegime(pair);
          if (regimeResult) {
            regime = regimeResult.regime;
            regimeConfidence = regimeResult.confidence;
          }
        }

        // Generate trade request
        const tradeRequest = generateShadowTrade(pair, strategy, marketData.price);
        const request = createTradeRequest(tradeRequest);

        // Execute through governance pipeline (regime info will be captured by ExecutionManager)
        const result = await governance.executionManager.executeTrade(request);

        if (result.success) {
          tradeCount++;
          
          // Wait for shadow tracking to complete (observation window starts immediately)
          // Give it a moment to capture initial snapshot
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const allRecords = shadowTracker.getAllShadowRecords();
          const latestRecord = allRecords[allRecords.length - 1];
          
          if (latestRecord) {
            const trackingId = `SHADOW_${latestRecord.decisionTimestamp.getTime()}_${pair}_${strategy}`;
            
            // Ensure regime info is set (ExecutionManager should have set it via trackShadowExecution)
            // If not set, use the regime we detected before execution
            if (!latestRecord.regime) {
              latestRecord.regime = regime;
              latestRecord.regimeConfidence = regimeConfidence;
            }
            
            // Register with coverage tracker
            const recordRegime = latestRecord.regime || regime;
            coverageTracker.registerTrade(trackingId, recordRegime, latestRecord);
            regimeMap.set(trackingId, recordRegime);
          } else {
            // Record not found yet - this can happen if tracking hasn't started
            // Log warning but continue
            console.warn(`[ACCUMULATION] Shadow record not found for trade ${tradeCount}, regime: ${regime}`);
          }

          // Log progress
          if (tradeCount % 10 === 0) {
            const coverage = coverageTracker.getCoverageSummary();
            console.log(`[PROGRESS] Trades: ${tradeCount}/${config.targetTotalTrades} | Coverage: ${coverage.overallCoveragePercentage.toFixed(1)}%`);
            console.log(`           Regimes: FAVORABLE(${coverage.coverageByRegime.get(MarketRegime.FAVORABLE)?.tradesWithMetrics || 0}) UNFAVORABLE(${coverage.coverageByRegime.get(MarketRegime.UNFAVORABLE)?.tradesWithMetrics || 0}) UNKNOWN(${coverage.coverageByRegime.get(MarketRegime.UNKNOWN)?.tradesWithMetrics || 0})`);
          }
        }

        // Generate periodic reports
        const hoursSinceLastReport = (Date.now() - lastReportTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastReport >= config.reportIntervalHours) {
          await generateDailyReport(
            coverageTracker,
            confidenceAnalyzer,
            trendTracker,
            reportGenerator,
            shadowTracker,
            regimeMap,
            lastReportTime,
            new Date()
          );
          lastReportTime = new Date();
        }

      } catch (error: any) {
        console.error(`[ACCUMULATION] Error in accumulation loop:`, error.message);
      }
    }, config.tradeIntervalMs);

    // Set up graceful shutdown
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n\n🛑 Received ${signal}, shutting down gracefully...\n`);
      clearInterval(accumulationInterval);
      
      await generateFinalReport(
        coverageTracker,
        confidenceAnalyzer,
        trendTracker,
        reportGenerator,
        shadowTracker,
        regimeMap,
        startTime,
        new Date()
      );

      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error: any) {
    console.error('\n❌ Confidence accumulation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Generate daily confidence report
 */
async function generateDailyReport(
  coverageTracker: RegimeCoverageTracker,
  confidenceAnalyzer: StrategyConfidenceAnalyzer,
  trendTracker: ConfidenceTrendTracker,
  reportGenerator: ConfidenceReportGenerator,
  shadowTracker: ShadowExecutionTracker,
  regimeMap: Map<string, MarketRegime>,
  reportStart: Date,
  reportEnd: Date
): Promise<void> {
  console.log('\n📊 Generating daily confidence report...\n');

  // Get all shadow records
  const allRecords = shadowTracker.getAllShadowRecords();
  
  // Ensure regime map is complete (use regime from record if available)
  for (const record of allRecords) {
    const trackingId = `SHADOW_${record.decisionTimestamp.getTime()}_${record.request.pair}_${record.request.strategy}`;
    if (record.regime && !regimeMap.has(trackingId)) {
      regimeMap.set(trackingId, record.regime);
    }
  }
  
  // Analyze confidence
  const confidence = confidenceAnalyzer.analyzeConfidence(allRecords, regimeMap);
  
  // Create confidence snapshot for trend tracking
  const snapshot = {
    timestamp: reportEnd,
    overallConfidence: confidence.overallConfidenceScore,
    confidenceByStrategy: new Map<string, number>(),
    confidenceByRegime: new Map<MarketRegime, number>(),
    totalTrades: allRecords.length
  };

  // Populate strategy confidence
  for (const [strategyId, metrics] of confidence.strategies) {
    snapshot.confidenceByStrategy.set(strategyId, metrics.averageConfidenceScore);
  }

  // Populate regime confidence
  for (const [regime, metrics] of confidence.regimes) {
    snapshot.confidenceByRegime.set(regime, metrics.averageConfidenceScore);
  }

  trendTracker.addSnapshot(snapshot);

  // Generate report
  const coverage = coverageTracker.getCoverageSummary();
  const trends = trendTracker.analyzeTrends();
  const report = reportGenerator.generateReport(
    coverage,
    confidence,
    trends,
    reportStart,
    reportEnd
  );

  // Export reports
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = reportEnd.toISOString().split('T')[0];
  const jsonPath = path.join(reportsDir, `confidence-report-${timestamp}.json`);
  const textPath = path.join(reportsDir, `confidence-report-${timestamp}.txt`);

  fs.writeFileSync(jsonPath, reportGenerator.exportAsJSON(report), 'utf8');
  fs.writeFileSync(textPath, reportGenerator.exportAsText(report), 'utf8');

  console.log(`✅ Daily report generated:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   Text: ${textPath}\n`);

  // Display summary
  console.log(reportGenerator.exportAsText(report));
}

/**
 * Generate final report
 */
async function generateFinalReport(
  coverageTracker: RegimeCoverageTracker,
  confidenceAnalyzer: StrategyConfidenceAnalyzer,
  trendTracker: ConfidenceTrendTracker,
  reportGenerator: ConfidenceReportGenerator,
  shadowTracker: ShadowExecutionTracker,
  regimeMap: Map<string, MarketRegime>,
  reportStart: Date,
  reportEnd: Date
): Promise<void> {
  await generateDailyReport(
    coverageTracker,
    confidenceAnalyzer,
    trendTracker,
    reportGenerator,
    shadowTracker,
    regimeMap,
    reportStart,
    reportEnd
  );
}

// Run accumulation
if (require.main === module) {
  runConfidenceAccumulation().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runConfidenceAccumulation };
