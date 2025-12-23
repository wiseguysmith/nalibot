import { calculateRSI, calculateMACD, calculateBollingerBands, calculateEMA } from './indicators';

// Mean Reversion Strategy
export function meanReversionStrategy(
  prices: number[],
  rsiPeriod: number = 14,
  rsiOversold: number = 30,
  rsiOverbought: number = 70,
  bbPeriod: number = 20,
  bbStdDev: number = 2
): { action: 'buy' | 'sell' | 'hold'; confidence: number; signals: string[] } {
  // Calculate indicators
  const rsi = calculateRSI(prices, rsiPeriod);
  const bb = calculateBollingerBands(prices, bbPeriod, bbStdDev);
  
  const lastPrice = prices[prices.length - 1];
  const lastBB = {
    upper: bb.upper[bb.upper.length - 1],
    middle: bb.middle[bb.middle.length - 1],
    lower: bb.lower[bb.lower.length - 1]
  };
  const lastRSI = rsi;
  
  // Initialize
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let confidence = 0;
  const signals: string[] = [];
  
  // Oversold conditions
  if (lastRSI < rsiOversold) {
    signals.push(`RSI oversold (${lastRSI.toFixed(2)})`);
    confidence += 0.3;
  }
  
  if (lastPrice < lastBB.lower) {
    signals.push(`Price below lower BB (${lastPrice.toFixed(2)} < ${lastBB.lower.toFixed(2)})`);
    confidence += 0.4;
  }
  
  // Overbought conditions
  if (lastRSI > rsiOverbought) {
    signals.push(`RSI overbought (${lastRSI.toFixed(2)})`);
    confidence -= 0.3;
  }
  
  if (lastPrice > lastBB.upper) {
    signals.push(`Price above upper BB (${lastPrice.toFixed(2)} > ${lastBB.upper.toFixed(2)})`);
    confidence -= 0.4;
  }
  
  // Determine action based on confidence
  if (confidence > 0.3) {
    action = 'buy';
  } else if (confidence < -0.3) {
    action = 'sell';
  }
  
  // Normalize confidence to 0-1 range
  confidence = Math.abs(confidence);
  confidence = Math.min(confidence, 1);
  
  return { action, confidence, signals };
}

// Trend Following Strategy with Volume Confirmation
export function trendFollowingStrategy(
  prices: number[],
  volumes: number[],
  shortEMA: number = 9,
  longEMA: number = 21,
  volumeEMA: number = 10
): { action: 'buy' | 'sell' | 'hold'; confidence: number; signals: string[] } {
  // Calculate EMAs
  const shortEmaValues = calculateEMA(prices, shortEMA);
  const longEmaValues = calculateEMA(prices, longEMA);
  const volumeEmaValues = calculateEMA(volumes, volumeEMA);
  
  // Get last values
  const lastShortEMA = shortEmaValues[shortEmaValues.length - 1];
  const prevShortEMA = shortEmaValues[shortEmaValues.length - 2];
  const lastLongEMA = longEmaValues[longEmaValues.length - 1];
  const prevLongEMA = longEmaValues[longEmaValues.length - 2];
  const lastVolume = volumes[volumes.length - 1];
  const lastVolumeEMA = volumeEmaValues[volumeEmaValues.length - 1];
  
  // Initialize
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let confidence = 0;
  const signals: string[] = [];
  
  // Check for EMA crossover
  const currentCrossover = lastShortEMA - lastLongEMA;
  const previousCrossover = prevShortEMA - prevLongEMA;
  
  // Bullish crossover (short EMA crosses above long EMA)
  if (currentCrossover > 0 && previousCrossover <= 0) {
    signals.push('Bullish EMA crossover');
    confidence += 0.4;
  }
  
  // Bearish crossover (short EMA crosses below long EMA)
  if (currentCrossover < 0 && previousCrossover >= 0) {
    signals.push('Bearish EMA crossover');
    confidence -= 0.4;
  }
  
  // Volume confirmation
  if (lastVolume > lastVolumeEMA * 1.5) {
    signals.push('High volume confirmation');
    if (confidence > 0) {
      confidence += 0.2;
    } else if (confidence < 0) {
      confidence -= 0.2;
    }
  }
  
  // Trend strength
  if (lastShortEMA > lastLongEMA) {
    const distance = (lastShortEMA - lastLongEMA) / lastLongEMA * 100;
    if (distance > 1) {
      signals.push(`Strong uptrend (${distance.toFixed(2)}%)`);
      confidence += 0.2;
    }
  } else {
    const distance = (lastLongEMA - lastShortEMA) / lastLongEMA * 100;
    if (distance > 1) {
      signals.push(`Strong downtrend (${distance.toFixed(2)}%)`);
      confidence -= 0.2;
    }
  }
  
  // Determine action based on confidence
  if (confidence > 0.3) {
    action = 'buy';
  } else if (confidence < -0.3) {
    action = 'sell';
  }
  
  // Normalize confidence to 0-1 range
  confidence = Math.abs(confidence);
  confidence = Math.min(confidence, 1);
  
  return { action, confidence, signals };
}

// Grid Trading Strategy
export function calculateGridLevels(
  currentPrice: number,
  gridCount: number = 10,
  gridSpread: number = 2.0, // in percentage
  upperLimit?: number,
  lowerLimit?: number
): {
  buyLevels: Array<{ price: number; allocation: number }>;
  sellLevels: Array<{ price: number; allocation: number }>;
} {
  // If limits are not specified, use a range around current price
  upperLimit = upperLimit || currentPrice * (1 + (gridSpread * gridCount) / 100);
  lowerLimit = lowerLimit || currentPrice * (1 - (gridSpread * gridCount) / 100);
  
  const range = upperLimit - lowerLimit;
  const step = range / gridCount;
  
  const buyLevels: Array<{ price: number; allocation: number }> = [];
  const sellLevels: Array<{ price: number; allocation: number }> = [];
  
  // Calculate grid levels with increasing allocation as price deviates further
  for (let i = 1; i <= gridCount; i++) {
    const buyPrice = currentPrice - i * step;
    const sellPrice = currentPrice + i * step;
    
    // Weight allocations more heavily toward middle grids
    const weight = Math.exp(-0.5 * Math.pow((i - gridCount / 2) / (gridCount / 4), 2));
    const allocation = Math.max(5, Math.round(weight * 100) / 10); // Min 5% allocation
    
    if (buyPrice >= lowerLimit) {
      buyLevels.push({
        price: buyPrice,
        allocation: allocation
      });
    }
    
    if (sellPrice <= upperLimit) {
      sellLevels.push({
        price: sellPrice,
        allocation: allocation
      });
    }
  }
  
  return { buyLevels, sellLevels };
}

// Cross-Exchange Arbitrage Strategy
export interface ExchangePriceData {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  fees: {
    maker: number;
    taker: number;
  };
  transferFee?: number; // Transfer fee in base currency units
}

export function findCrossExchangeArbitrage(
  priceData: ExchangePriceData[],
  minProfitPercent: number = 1.0,
  tradeAmount: number = 1000
): Array<{
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  estimatedProfit: number;
  totalFees: number;
}> {
  const opportunities: Array<{
    buyExchange: string;
    sellExchange: string;
    symbol: string;
    buyPrice: number;
    sellPrice: number;
    profitPercent: number;
    estimatedProfit: number;
    totalFees: number;
  }> = [];
  
  // Group by symbol
  const symbolMap: { [symbol: string]: ExchangePriceData[] } = {};
  
  priceData.forEach(data => {
    if (!symbolMap[data.symbol]) {
      symbolMap[data.symbol] = [];
    }
    symbolMap[data.symbol].push(data);
  });
  
  // Find arbitrage opportunities for each symbol
  Object.entries(symbolMap).forEach(([symbol, exchangeData]) => {
    // Skip if there's only one exchange for this symbol
    if (exchangeData.length < 2) return;
    
    for (let i = 0; i < exchangeData.length; i++) {
      for (let j = 0; j < exchangeData.length; j++) {
        if (i === j) continue;
        
        const buyExchange = exchangeData[i];
        const sellExchange = exchangeData[j];
        
        // Calculate potential profit
        const buyPrice = buyExchange.ask;
        const sellPrice = sellExchange.bid;
        
        // Skip if not profitable at face value
        if (buyPrice >= sellPrice) continue;
        
        // Calculate fees
        const buyFee = tradeAmount * buyExchange.fees.taker;
        const sellFee = tradeAmount * sellExchange.fees.maker;
        const transferFee = buyExchange.transferFee || 0;
        const totalFees = buyFee + sellFee + transferFee;
        
        // Calculate profit
        const units = tradeAmount / buyPrice;
        const grossSellAmount = units * sellPrice;
        const netProfit = grossSellAmount - tradeAmount - totalFees;
        const profitPercent = (netProfit / tradeAmount) * 100;
        
        // Only include if profit meets minimum threshold
        if (profitPercent >= minProfitPercent) {
          opportunities.push({
            buyExchange: buyExchange.exchange,
            sellExchange: sellExchange.exchange,
            symbol: symbol,
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            profitPercent: profitPercent,
            estimatedProfit: netProfit,
            totalFees: totalFees
          });
        }
      }
    }
  });
  
  // Sort by profit percent (descending)
  return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
}

// Function to identify volatility breakouts
export function volatilityBreakoutStrategy(
  prices: number[],
  volumes: number[],
  atrPeriod: number = 14,
  breakoutThreshold: number = 1.5
): { action: 'buy' | 'sell' | 'hold'; confidence: number; signals: string[] } {
  // Calculate Average True Range (ATR) - simplified version
  const atr = calculateATR(prices, atrPeriod);
  const lastATR = atr[atr.length - 1];
  
  // Calculate price changes
  const priceChanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    priceChanges.push(Math.abs(prices[i] - prices[i - 1]));
  }
  
  const lastPriceChange = priceChanges[priceChanges.length - 1];
  const volumeRatio = volumes[volumes.length - 1] / average(volumes.slice(-10));
  
  // Initialize
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let confidence = 0;
  const signals: string[] = [];
  
  // Check for breakout
  const isBreakout = lastPriceChange > lastATR * breakoutThreshold;
  const direction = prices[prices.length - 1] > prices[prices.length - 2] ? 'up' : 'down';
  
  if (isBreakout) {
    signals.push(`Volatility breakout (${(lastPriceChange / lastATR).toFixed(2)}x ATR)`);
    
    if (direction === 'up' && volumeRatio > 1.5) {
      signals.push(`High volume upward breakout (${volumeRatio.toFixed(2)}x avg volume)`);
      confidence = 0.7;
      action = 'buy';
    } else if (direction === 'down' && volumeRatio > 1.5) {
      signals.push(`High volume downward breakout (${volumeRatio.toFixed(2)}x avg volume)`);
      confidence = 0.7;
      action = 'sell';
    } else if (direction === 'up') {
      signals.push('Upward breakout with normal volume');
      confidence = 0.4;
      action = 'buy';
    } else {
      signals.push('Downward breakout with normal volume');
      confidence = 0.4;
      action = 'sell';
    }
  }
  
  return { action, confidence, signals };
}

// Helper function to calculate ATR
function calculateATR(prices: number[], period: number): number[] {
  const trueRanges: number[] = [];
  
  // Calculate true ranges
  for (let i = 1; i < prices.length; i++) {
    const high = prices[i];
    const low = prices[i - 1];
    const previousClose = prices[i - 1];
    
    const tr1 = Math.abs(high - low);
    const tr2 = Math.abs(high - previousClose);
    const tr3 = Math.abs(low - previousClose);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }
  
  // Calculate ATR using simple moving average
  const atr: number[] = [];
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      atr.push(average(trueRanges.slice(0, i + 1)));
    } else {
      atr.push(average(trueRanges.slice(i - period + 1, i + 1)));
    }
  }
  
  return atr;
}

// Helper function for average
function average(arr: number[]): number {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
} 