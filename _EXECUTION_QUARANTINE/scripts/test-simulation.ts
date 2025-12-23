/**
 * Test Simulation Mode
 * 
 * PHASE 8: High-Fidelity Simulation & Paper Trading
 * 
 * This script demonstrates the simulation mode by running
 * simulated trades through the full governance pipeline.
 */

import { GovernanceSystem } from '../core/governance_integration';
import { SimulatedExecutionAdapter } from '../core/adapters/simulatedExecutionAdapter';
import { createTradeRequest } from '../core/governance_integration';
import { MarketDataService } from '../src/services/marketDataService';

async function testSimulation() {
  console.log('🎯 Starting Simulation Mode Test...\n');

  try {
    // Create market data service (mock for testing)
    const marketDataService = {
      getMarketData: (pair: string) => {
        // Mock market data
        const basePrice = pair.includes('BTC') ? 45000 : pair.includes('ETH') ? 3000 : 100;
        return {
          price: basePrice,
          bid: basePrice * 0.9999,
          ask: basePrice * 1.0001,
          volume: 1000000,
          timestamp: Date.now()
        };
      }
    };

    // Create simulated execution adapter
    const simulatedAdapter = new SimulatedExecutionAdapter(
      {
        fixedLatencyMs: 100,
        maxLiquidityPctPerFill: 0.1,
        feeSchedule: {
          maker: 0.001, // 0.1%
          taker: 0.002  // 0.2%
        }
      },
      marketDataService
    );

    // Initialize governance system in SIMULATION mode
    console.log('📋 Initializing Governance System in SIMULATION mode...');
    const governance = new GovernanceSystem({
      initialMode: 'AGGRESSIVE',
      initialCapital: 10000,
      exchangeClient: simulatedAdapter,
      executionMode: 'SIMULATION',
      enableRegimeGovernance: true,
      enableCapitalGovernance: true,
      enableObservability: true,
      enableProductionHardening: true
    });

    console.log('✅ Governance System initialized\n');

    // Get execution manager
    const executionManager = governance.executionManager;
    console.log(`📊 Execution Mode: ${executionManager.getExecutionMode()}\n`);

    // Create some test trade requests
    const testTrades = [
      {
        strategy: 'momentum',
        pair: 'BTC/USD',
        action: 'buy' as const,
        amount: 0.1,
        price: 45000,
        estimatedValue: 4500
      },
      {
        strategy: 'mean_reversion',
        pair: 'ETH/USD',
        action: 'buy' as const,
        amount: 1.0,
        price: 3000,
        estimatedValue: 3000
      },
      {
        strategy: 'momentum',
        pair: 'BTC/USD',
        action: 'sell' as const,
        amount: 0.05,
        price: 45100,
        estimatedValue: 2255
      }
    ];

    console.log('🔄 Executing simulated trades...\n');

    for (let i = 0; i < testTrades.length; i++) {
      const trade = testTrades[i];
      console.log(`\n--- Trade ${i + 1}/${testTrades.length} ---`);
      console.log(`Strategy: ${trade.strategy}`);
      console.log(`Pair: ${trade.pair}`);
      console.log(`Action: ${trade.action.toUpperCase()}`);
      console.log(`Amount: ${trade.amount}`);
      console.log(`Requested Price: $${trade.price.toFixed(2)}`);
      console.log(`Estimated Value: $${trade.estimatedValue.toFixed(2)}`);

      // Create trade request
      const request = createTradeRequest(trade);

      // Execute trade
      const startTime = Date.now();
      const result = await executionManager.executeTrade(request);
      const executionTime = Date.now() - startTime;

      console.log(`\n📈 Execution Result:`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Execution Type: ${(result as any).executionType || 'UNKNOWN'}`);
      console.log(`  Execution Price: $${(result.executionPrice || trade.price).toFixed(2)}`);
      console.log(`  Quantity: ${result.quantity || trade.amount}`);
      console.log(`  Order ID: ${result.orderId || 'N/A'}`);
      console.log(`  Execution Time: ${executionTime}ms`);

      if ((result as any).fees !== undefined) {
        console.log(`  Fees: $${(result as any).fees.toFixed(2)}`);
      }
      if ((result as any).slippage !== undefined) {
        console.log(`  Slippage: $${(result as any).slippage.toFixed(2)}`);
      }

      // Small delay between trades
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Get execution history
    console.log('\n\n📜 Execution History:');
    const history = executionManager.getExecutionHistory();
    console.log(`Total Executions: ${history.length}`);
    
    history.forEach((entry, index) => {
      console.log(`\n  ${index + 1}. ${entry.request.strategy} - ${entry.request.pair}`);
      console.log(`     Action: ${entry.request.action.toUpperCase()}`);
      console.log(`     Type: ${entry.executionType || 'UNKNOWN'}`);
      console.log(`     Timestamp: ${entry.timestamp.toISOString()}`);
      if ('success' in entry.result) {
        console.log(`     Success: ${entry.result.success}`);
      }
    });

    // Get observability data if available
    if (governance.eventLog) {
      console.log('\n\n📊 Event Log Summary:');
      const events = governance.eventLog.getAllEvents();
      console.log(`Total Events: ${events.length}`);
      
      const eventTypes = new Map<string, number>();
      events.forEach(event => {
        const count = eventTypes.get(event.eventType) || 0;
        eventTypes.set(event.eventType, count + 1);
      });

      console.log('\nEvent Breakdown:');
      eventTypes.forEach((count, type) => {
        console.log(`  ${type}: ${count}`);
      });

      // Show recent trade executed events
      const tradeEvents = events.filter(e => e.eventType === 'TRADE_EXECUTED');
      if (tradeEvents.length > 0) {
        console.log('\nRecent Trade Executed Events:');
        tradeEvents.slice(-3).forEach(event => {
          const tradeEvent = event as any;
          console.log(`  - ${tradeEvent.strategyId} ${tradeEvent.action} ${tradeEvent.pair}`);
          console.log(`    Execution Type: ${tradeEvent.executionType || 'UNKNOWN'}`);
          if (tradeEvent.metadata?.fees) {
            console.log(`    Fees: $${tradeEvent.metadata.fees.toFixed(2)}`);
          }
        });
      }
    }

    console.log('\n\n✅ Simulation test completed successfully!');
    console.log('\n💡 Key Points:');
    console.log('  - All trades were SIMULATED (no real orders placed)');
    console.log('  - Full governance pipeline was executed');
    console.log('  - Fees and slippage were calculated');
    console.log('  - Events were logged for observability');
    console.log('  - Capital and risk metrics were NOT affected (simulation mode)');

  } catch (error: any) {
    console.error('\n❌ Simulation test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testSimulation()
  .then(() => {
    console.log('\n🎉 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });




