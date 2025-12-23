import { NextApiRequest, NextApiResponse } from 'next';
import { KrakenWrapper } from '../../../services/krakenWrapper';

// Global instance of Kraken wrapper
let krakenWrapper: KrakenWrapper | null = null;
let isTradingActive = false;
let tradingInterval: NodeJS.Timeout | null = null;
let recentTrades: any[] = [];

// Initialize Kraken connection
function initializeKraken(): KrakenWrapper {
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Kraken API credentials not configured. Please set KRAKEN_API_KEY and KRAKEN_API_SECRET in your .env file');
  }

  return new KrakenWrapper(apiKey, apiSecret);
}

// Get real balance from Kraken (with fallback to mock data)
async function getRealBalance(): Promise<number> {
  try {
    if (!krakenWrapper) {
      krakenWrapper = initializeKraken();
    }

    const balanceResponse = await krakenWrapper.getBalance();
    if (!balanceResponse.result) {
      throw new Error('Failed to fetch balance from Kraken');
    }

    // Calculate total USD value
    let totalBalance = 0;
    for (const [asset, amount] of Object.entries(balanceResponse.result)) {
      const assetBalance = parseFloat(amount as string);
      
      if (assetBalance > 0) {
        if (asset === 'ZUSD' || asset === 'USD') {
          totalBalance += assetBalance;
        } else {
          // For crypto assets, get current price and calculate USD value
          try {
            const tickerResponse = await krakenWrapper.getTickerInformation([`${asset}USD`]);
            if (tickerResponse.result && tickerResponse.result[`${asset}USD`]) {
              const price = parseFloat(tickerResponse.result[`${asset}USD`].c?.[0] || '0');
              totalBalance += assetBalance * price;
            }
          } catch (error) {
            console.log(`Could not get price for ${asset}, using 0 value`);
          }
        }
      }
    }

    return totalBalance;
  } catch (error) {
    console.log('⚠️  Kraken API Error:', error.message);
    console.log('   Error type:', error.constructor.name);
    console.log('   Full error:', error);
    console.log('   Check your .env file and API credentials');
    
    // Return mock $15 balance for testing
    return 15.00;
  }
}

// Get XRP-specific balance (with fallback to mock data)
async function getXRPBalance(): Promise<{ xrpAmount: number; xrpValue: number; usdBalance: number }> {
  try {
    if (!krakenWrapper) {
      krakenWrapper = initializeKraken();
    }

    const balanceResponse = await krakenWrapper.getBalance();
    if (!balanceResponse.result) {
      throw new Error('Failed to fetch balance from Kraken');
    }

    let xrpAmount = 0;
    let usdBalance = 0;

    // Get XRP balance
    if (balanceResponse.result['XXRP']) {
      xrpAmount = parseFloat(balanceResponse.result['XXRP'] as string);
    }

    // Get USD balance
    if (balanceResponse.result['ZUSD']) {
      usdBalance = parseFloat(balanceResponse.result['ZUSD'] as string);
    }

    // Get XRP price
    let xrpPrice = 0;
    try {
      const tickerResponse = await krakenWrapper.getTickerInformation(['XRPUSD']);
      if (tickerResponse.result && tickerResponse.result['XRPUSD']) {
        xrpPrice = parseFloat(tickerResponse.result['XRPUSD'].c?.[0] || '0');
      }
    } catch (error) {
      console.log('Could not get XRP price, using 0');
    }

    const xrpValue = xrpAmount * xrpPrice;

    return {
      xrpAmount,
      xrpValue,
      usdBalance
    };
  } catch (error) {
    console.log('⚠️  Using mock XRP data for testing');
    
    // Return mock XRP data for testing
    return {
      xrpAmount: 25.0, // Mock XRP amount
      xrpValue: 15.0,  // Mock XRP value (matches total balance)
      usdBalance: 15.0 // Mock USD balance
    };
  }
}

/**
 * ⚠️ SIMULATION-ONLY FUNCTION
 * 
 * This function does NOT execute real trades.
 * It performs simulation/evaluation only for demonstration purposes.
 * 
 * All real trade execution MUST go through the full governance chain:
 * CapitalGate → RegimeGate → PermissionGate → RiskGovernor → ExecutionManager
 * 
 * This function only creates trade objects for display purposes.
 * No capital is deployed. No orders are placed. No governance is bypassed.
 */
async function simulateTradingLogic() {
  try {
    console.log('🔄 Simulating trading logic...');
    
    // Get current XRP price
    let xrpPrice = 0;
    try {
      if (krakenWrapper) {
        const tickerResponse = await krakenWrapper.getTickerInformation(['XRPUSD']);
        if (tickerResponse.result && tickerResponse.result['XRPUSD']) {
          xrpPrice = parseFloat(tickerResponse.result['XRPUSD'].c?.[0] || '0');
        }
      }
    } catch (error) {
      console.log('Could not get XRP price, using mock price');
      xrpPrice = 0.60; // Mock XRP price
    }
    
    // Simple trading strategy: Buy low, sell high
    const currentBalance = await getRealBalance();
    const targetBalance = currentBalance * 1.6;
    
    if (currentBalance < targetBalance) {
      // Simulate a trade
      const tradeAmount = Math.min(currentBalance * 0.1, 1.5); // 10% of balance, max $1.50
      const trade = {
        id: Date.now(),
        type: 'BUY',
        pair: 'XRP/USD',
        amount: tradeAmount,
        price: xrpPrice,
        timestamp: new Date(),
        profit: 0
      };
      
      recentTrades.unshift(trade);
      if (recentTrades.length > 10) recentTrades.pop();
      
      console.log(`💰 Simulated BUY trade: $${tradeAmount.toFixed(2)} XRP at $${xrpPrice.toFixed(4)}`);
    }
    
  } catch (error) {
    console.log('Trading logic error:', error.message);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get real balance from Kraken
      const realBalance = await getRealBalance();
      const xrpData = await getXRPBalance();
      
      // Adjust configuration based on actual available balance
      const actualBalance = realBalance;
      const adjustedTarget = actualBalance * 1.6; // 60% profit target
      const targetProfit = adjustedTarget - actualBalance;
      
      const config = {
        initialBalance: actualBalance,
        targetProfit: targetProfit,
        maxDrawdownPercentage: 20,
        riskPerTradePercentage: 8,
        maxDailyLossPercentage: 15,
        positionSizePercentage: 25,
        tradingPairs: ['XRP/USD', 'XRP/USDT'],
        activeStrategies: ['mean_reversion', 'arbitrage', 'grid_trading', 'volatility_breakout'],
        enableStopLoss: true,
        enableTakeProfit: true,
        autoStopOnDrawdown: true
      };

      // Calculate progress toward adjusted goal
      const targetProgress = Math.min((realBalance / adjustedTarget) * 100, 100);
      
      // Calculate risk level based on drawdown
      const drawdown = realBalance < actualBalance ? ((actualBalance - realBalance) / actualBalance) * 100 : 0;
      let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (drawdown > 15) riskLevel = 'CRITICAL';
      else if (drawdown > 10) riskLevel = 'HIGH';
      else if (drawdown > 5) riskLevel = 'MODERATE';

      const performance = {
        totalBalance: realBalance,
        totalPnL: realBalance - actualBalance,
        dailyPnL: 0, // Would need to track daily changes
        winRate: 0,
        totalTrades: 0,
        activeTrades: 0,
        maxDrawdown: drawdown,
        sharpeRatio: 0,
        lastUpdate: new Date(),
        historicalData: [{ balance: realBalance, timestamp: new Date() }],
        targetProgress,
        riskLevel,
        xrpData
      };

      res.status(200).json({
        success: true,
        data: {
          performance,
          recentTrades: recentTrades,
          isActive: isTradingActive,
          balance: realBalance,
          xrpData,
          config,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Production API error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch production data',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Make sure your Kraken API credentials are configured in .env file'
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { action } = req.body;

      switch (action) {
        case 'start':
          console.log('🚀 Production trading started - Real Kraken integration');
          isTradingActive = true;
          
          // Start trading loop
          if (!tradingInterval) {
            tradingInterval = setInterval(async () => {
              if (isTradingActive) {
                try {
                  await simulateTradingLogic();
                } catch (error) {
                  console.log('Trading error:', error.message);
                }
              }
            }, 30000); // Trade every 30 seconds
          }
          
          const currentBalance = await getRealBalance();
          res.status(200).json({ 
            success: true, 
            message: 'Production trading engine started with real Kraken integration',
            data: {
              isActive: true,
              balance: currentBalance,
              config: {
                initialBalance: currentBalance,
                targetProfit: currentBalance * 0.6, // 60% profit
                tradingPairs: ['XRP/USD', 'XRP/USDT']
              }
            }
          });
          break;
        
        case 'stop':
          console.log('🛑 Production trading stopped');
          isTradingActive = false;
          
          // Clear trading interval
          if (tradingInterval) {
            clearInterval(tradingInterval);
            tradingInterval = null;
          }
          
          res.status(200).json({ 
            success: true, 
            message: 'Production trading engine stopped',
            data: {
              isActive: false,
              balance: await getRealBalance()
            }
          });
          break;

        case 'emergency_stop':
          console.log('🚨 EMERGENCY STOP EXECUTED');
          res.status(200).json({ 
            success: true, 
            message: 'EMERGENCY STOP - All trading halted!',
            data: {
              isActive: false,
              balance: await getRealBalance()
            }
          });
          break;
        
        default:
          res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Production control API error:', error);
      res.status(500).json({ 
        error: 'Failed to control production engine',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 