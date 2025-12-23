export function calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

  return {
    macdLine,
    signalLine,
    histogram
  };
}

export function calculateRSI(prices: number[], period = 14): number {
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);

  const avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  const avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateBollingerBands(prices: number[], period = 20, stdDev = 2) {
  const sma = calculateSMA(prices, period);
  const stdDeviation = calculateStandardDeviation(prices, period);

  return {
    upper: sma.map(price => price + (stdDeviation * stdDev)),
    middle: sma,
    lower: sma.map(price => price - (stdDeviation * stdDev))
  };
}

export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);
  
  // Calculate EMA for the rest of the prices
  for (let i = period; i < prices.length; i++) {
    const newEma = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(newEma);
  }
  
  return ema;
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b);
    sma.push(sum / period);
  }

  return sma;
}

function calculateStandardDeviation(prices: number[], period: number): number {
  const sma = calculateSMA(prices, period);
  const squaredDiffs = prices.slice(period - 1).map((price, i) => 
    Math.pow(price - sma[i], 2)
  );
  
  const variance = squaredDiffs.reduce((a, b) => a + b) / period;
  return Math.sqrt(variance);
} 