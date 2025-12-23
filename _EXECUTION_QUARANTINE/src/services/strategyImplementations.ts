import { MarketRegime } from './advancedBacktestingEngine';

export interface Signal {
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-1
  reason: string;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
}

export class StrategyImplementations {
  
  /**
   * Mean Reversion Strategy
   * Best in ranging markets with low volatility
   */
  static generateMeanReversionSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 20) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const rsi = this.calculateRSI(candles, 14);
    const bbLower = this.calculateBollingerBands(candles, 20, 2).lower;
    const bbUpper = this.calculateBollingerBands(candles, 20, 2).upper;
    
    // Only trade in ranging markets
    if (marketRegime.type !== 'ranging' && marketRegime.confidence < 0.7) {
      return null;
    }
    
    let signal: Signal | null = null;
    let reason = '';
    let strength = 0;
    
    // Oversold condition
    if (rsi < 30 && currentPrice < bbLower) {
      signal = {
        type: 'BUY',
        strength: Math.min((30 - rsi) / 30, 1),
        reason: `RSI oversold (${rsi.toFixed(1)}) and price below lower Bollinger Band`,
        stopLoss: currentPrice * 0.95,
        takeProfit: currentPrice * 1.03,
        confidence: marketRegime.confidence
      };
    }
    // Overbought condition
    else if (rsi > 70 && currentPrice > bbUpper) {
      signal = {
        type: 'SELL',
        strength: Math.min((rsi - 70) / 30, 1),
        reason: `RSI overbought (${rsi.toFixed(1)}) and price above upper Bollinger Band`,
        stopLoss: currentPrice * 1.05,
        takeProfit: currentPrice * 0.97,
        confidence: marketRegime.confidence
      };
    }
    
    return signal;
  }

  /**
   * Trend Following Strategy
   * Best in trending markets with high ADX
   */
  static generateTrendFollowingSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 26) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const ema9 = this.calculateEMA(candles, 9);
    const ema21 = this.calculateEMA(candles, 21);
    const adx = marketRegime.adx;
    
    // Only trade in trending markets
    if (marketRegime.type !== 'trending' || adx < 25) {
      return null;
    }
    
    let signal: Signal | null = null;
    
    // Bullish trend
    if (ema9 > ema21 && currentPrice > ema9) {
      signal = {
        type: 'BUY',
        strength: Math.min(adx / 50, 1),
        reason: `Bullish trend: EMA9 > EMA21, ADX = ${adx.toFixed(1)}`,
        stopLoss: ema21 * 0.98,
        takeProfit: currentPrice * 1.05,
        confidence: marketRegime.confidence
      };
    }
    // Bearish trend
    else if (ema9 < ema21 && currentPrice < ema9) {
      signal = {
        type: 'SELL',
        strength: Math.min(adx / 50, 1),
        reason: `Bearish trend: EMA9 < EMA21, ADX = ${adx.toFixed(1)}`,
        stopLoss: ema21 * 1.02,
        takeProfit: currentPrice * 0.95,
        confidence: marketRegime.confidence
      };
    }
    
    return signal;
  }

  /**
   * Breakout Strategy
   * Low false signals with volume confirmation
   */
  static generateBreakoutSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 20) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const currentVolume = candles[candles.length - 1].volume;
    const bbUpper = this.calculateBollingerBands(candles, 20, 2).upper;
    const bbLower = this.calculateBollingerBands(candles, 20, 2).lower;
    
    // Calculate average volume
    const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
    
    let signal: Signal | null = null;
    
    // Bullish breakout with volume confirmation
    if (currentPrice > bbUpper && currentVolume > avgVolume * 1.5) {
      signal = {
        type: 'BUY',
        strength: Math.min(currentVolume / (avgVolume * 2), 1),
        reason: `Bullish breakout above upper BB with ${(currentVolume/avgVolume).toFixed(1)}x volume`,
        stopLoss: bbUpper * 0.98,
        takeProfit: currentPrice * 1.08,
        confidence: 0.8
      };
    }
    // Bearish breakout with volume confirmation
    else if (currentPrice < bbLower && currentVolume > avgVolume * 1.5) {
      signal = {
        type: 'SELL',
        strength: Math.min(currentVolume / (avgVolume * 2), 1),
        reason: `Bearish breakout below lower BB with ${(currentVolume/avgVolume).toFixed(1)}x volume`,
        stopLoss: bbLower * 1.02,
        takeProfit: currentPrice * 0.92,
        confidence: 0.8
      };
    }
    
    return signal;
  }

  /**
   * Funding Rate Arbitrage Strategy
   * Exploits differences between perpetual futures and spot
   */
  static generateFundingArbitrageSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    // This would require real-time funding rate data
    // For now, simulate based on market conditions
    
    const currentPrice = candles[candles.length - 1].close;
    const volatility = marketRegime.volatility;
    
    // Simulate funding rate opportunities
    const fundingRate = (Math.random() - 0.5) * 0.001; // -0.05% to +0.05%
    
    if (Math.abs(fundingRate) > 0.0003) { // 0.03% threshold
      const signal: Signal = {
        type: fundingRate > 0 ? 'SELL' : 'BUY',
        strength: Math.min(Math.abs(fundingRate) / 0.001, 1),
        reason: `Funding rate arbitrage: ${(fundingRate * 100).toFixed(3)}% rate`,
        stopLoss: currentPrice * (fundingRate > 0 ? 1.02 : 0.98),
        takeProfit: currentPrice * (fundingRate > 0 ? 0.99 : 1.01),
        confidence: 0.9
      };
      return signal;
    }
    
    return null;
  }

  /**
   * Grid Trading Strategy
   * Automated buy/sell at predetermined levels
   */
  static generateGridSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 20) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const gridSpacing = strategy.parameters.gridSpacing || 0.02; // 2% spacing
    const gridLevels = strategy.parameters.gridLevels || 5;
    
    // Calculate grid levels
    const basePrice = currentPrice;
    const buyLevels = [];
    const sellLevels = [];
    
    for (let i = 1; i <= gridLevels; i++) {
      buyLevels.push(basePrice * (1 - i * gridSpacing));
      sellLevels.push(basePrice * (1 + i * gridSpacing));
    }
    
    // Check if price is near a grid level
    for (const buyLevel of buyLevels) {
      if (Math.abs(currentPrice - buyLevel) / currentPrice < 0.005) { // 0.5% tolerance
        return {
          type: 'BUY',
          strength: 0.7,
          reason: `Grid buy level at $${buyLevel.toFixed(2)}`,
          stopLoss: buyLevel * 0.98,
          takeProfit: buyLevel * 1.02,
          confidence: 0.8
        };
      }
    }
    
    for (const sellLevel of sellLevels) {
      if (Math.abs(currentPrice - sellLevel) / currentPrice < 0.005) {
        return {
          type: 'SELL',
          strength: 0.7,
          reason: `Grid sell level at $${sellLevel.toFixed(2)}`,
          stopLoss: sellLevel * 1.02,
          takeProfit: sellLevel * 0.98,
          confidence: 0.8
        };
      }
    }
    
    return null;
  }

  /**
   * Momentum Strategy
   * Captures strong price movements
   */
  static generateMomentumSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 14) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const rsi = this.calculateRSI(candles, 14);
    const macd = this.calculateMACD(candles, 12, 26, 9);
    
    let signal: Signal | null = null;
    
    // Strong momentum up
    if (rsi > 50 && rsi < 80 && macd.histogram > 0 && macd.histogram > macd.signal) {
      signal = {
        type: 'BUY',
        strength: Math.min(rsi / 100, 1),
        reason: `Momentum up: RSI ${rsi.toFixed(1)}, MACD bullish`,
        stopLoss: currentPrice * 0.97,
        takeProfit: currentPrice * 1.06,
        confidence: 0.7
      };
    }
    // Strong momentum down
    else if (rsi < 50 && rsi > 20 && macd.histogram < 0 && macd.histogram < macd.signal) {
      signal = {
        type: 'SELL',
        strength: Math.min((100 - rsi) / 100, 1),
        reason: `Momentum down: RSI ${rsi.toFixed(1)}, MACD bearish`,
        stopLoss: currentPrice * 1.03,
        takeProfit: currentPrice * 0.94,
        confidence: 0.7
      };
    }
    
    return signal;
  }

  /**
   * Defensive Strategy
   * Capital preservation in bear markets
   */
  static generateDefensiveSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 20) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const volatility = marketRegime.volatility;
    
    // Only trade in low volatility conditions
    if (volatility > 0.05) {
      return null;
    }
    
    // Look for oversold conditions with strong support
    const rsi = this.calculateRSI(candles, 14);
    const bbLower = this.calculateBollingerBands(candles, 20, 2).lower;
    
    if (rsi < 25 && currentPrice < bbLower * 1.01) {
      return {
        type: 'BUY',
        strength: 0.5, // Conservative
        reason: `Defensive buy: RSI oversold (${rsi.toFixed(1)}) near support`,
        stopLoss: currentPrice * 0.95,
        takeProfit: currentPrice * 1.02,
        confidence: 0.6
      };
    }
    
    return null;
  }

  /**
   * Scalping Strategy
   * High-frequency small profits
   */
  static generateScalpingSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 10) return null;
    
    const currentPrice = candles[candles.length - 1].close;
    const volume = candles[candles.length - 1].volume;
    const avgVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    
    // Look for volume spikes
    if (volume > avgVolume * 2) {
      const priceChange = (currentPrice - candles[candles.length - 2].close) / candles[candles.length - 2].close;
      
      if (priceChange > 0.005) { // 0.5% move
        return {
          type: 'BUY',
          strength: 0.6,
          reason: `Scalp: Volume spike with ${(priceChange * 100).toFixed(2)}% move`,
          stopLoss: currentPrice * 0.995,
          takeProfit: currentPrice * 1.01,
          confidence: 0.5
        };
      } else if (priceChange < -0.005) {
        return {
          type: 'SELL',
          strength: 0.6,
          reason: `Scalp: Volume spike with ${(priceChange * 100).toFixed(2)}% move`,
          stopLoss: currentPrice * 1.005,
          takeProfit: currentPrice * 0.99,
          confidence: 0.5
        };
      }
    }
    
    return null;
  }

  /**
   * Seasonal Strategy
   * Calendar-based trading patterns
   */
  static generateSeasonalSignal(candles: any[], strategy: any, marketRegime: MarketRegime): Signal | null {
    if (candles.length < 1) return null;
    
    const currentDate = new Date(candles[candles.length - 1].timestamp);
    const dayOfWeek = currentDate.getDay();
    const hour = currentDate.getHours();
    
    // Weekend effect: BTC often dips on weekends, recovers Monday
    if (dayOfWeek === 0 && hour < 12) { // Sunday morning
      return {
        type: 'BUY',
        strength: 0.4,
        reason: 'Seasonal: Sunday morning dip buy',
        stopLoss: candles[candles.length - 1].close * 0.98,
        takeProfit: candles[candles.length - 1].close * 1.03,
        confidence: 0.4
      };
    }
    
    // End of month effect
    const dayOfMonth = currentDate.getDate();
    if (dayOfMonth >= 25 && dayOfMonth <= 31) {
      return {
        type: 'SELL',
        strength: 0.3,
        reason: 'Seasonal: End of month profit taking',
        stopLoss: candles[candles.length - 1].close * 1.02,
        takeProfit: candles[candles.length - 1].close * 0.97,
        confidence: 0.3
      };
    }
    
    return null;
  }

  // Technical indicator calculations
  static calculateRSI(candles: any[], period: number): number {
    if (candles.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = candles[candles.length - i].close - candles[candles.length - i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  static calculateEMA(candles: any[], period: number): number {
    if (candles.length < period) return candles[candles.length - 1].close;
    
    const multiplier = 2 / (period + 1);
    let ema = candles[candles.length - period].close;
    
    for (let i = candles.length - period + 1; i < candles.length; i++) {
      ema = (candles[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  static calculateBollingerBands(candles: any[], period: number, stdDev: number) {
    if (candles.length < period) {
      const price = candles[candles.length - 1].close;
      return { upper: price, middle: price, lower: price };
    }
    
    const prices = candles.slice(-period).map(c => c.close);
    const sma = prices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  static calculateMACD(candles: any[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
    if (candles.length < slowPeriod) {
      return { macd: 0, signal: 0, histogram: 0 };
    }
    
    const fastEMA = this.calculateEMA(candles, fastPeriod);
    const slowEMA = this.calculateEMA(candles, slowPeriod);
    const macd = fastEMA - slowEMA;
    
    // Simplified signal line calculation
    const signal = macd * 0.8; // Placeholder
    
    return {
      macd,
      signal,
      histogram: macd - signal
    };
  }
} 