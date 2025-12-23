export interface SentimentData {
  source: 'twitter' | 'reddit' | 'news' | 'technical' | 'social';
  score: number; // -1 to 1 (negative to positive)
  confidence: number; // 0 to 1
  timestamp: Date;
  keywords: string[];
}

export interface MarketSentiment {
  overall: number; // -1 to 1
  confidence: number; // 0 to 1
  sources: {
    twitter: number;
    reddit: number;
    news: number;
    technical: number;
    social: number;
  };
  trends: {
    shortTerm: 'bullish' | 'bearish' | 'neutral';
    mediumTerm: 'bullish' | 'bearish' | 'neutral';
    longTerm: 'bullish' | 'bearish' | 'neutral';
  };
  signals: string[];
  lastUpdated: Date;
}

export class SentimentAnalyzer {
  private sentimentHistory: SentimentData[] = [];
  private currentSentiment: MarketSentiment;
  private config = {
    updateInterval: 5 * 60 * 1000, // 5 minutes
    historyLength: 24 * 60 * 60 * 1000, // 24 hours
    minConfidence: 0.6,
    sources: {
      twitter: { weight: 0.3, enabled: true },
      reddit: { weight: 0.2, enabled: true },
      news: { weight: 0.25, enabled: true },
      technical: { weight: 0.15, enabled: true },
      social: { weight: 0.1, enabled: true }
    }
  };

  constructor() {
    this.currentSentiment = {
      overall: 0,
      confidence: 0,
      sources: {
        twitter: 0,
        reddit: 0,
        news: 0,
        technical: 0,
        social: 0
      },
      trends: {
        shortTerm: 'neutral',
        mediumTerm: 'neutral',
        longTerm: 'neutral'
      },
      signals: [],
      lastUpdated: new Date()
    };
  }

  // Autonomous sentiment analysis
  async analyzeSentiment(symbol: string): Promise<MarketSentiment> {
    console.log(`🤖 Sentiment Analyzer: Analyzing ${symbol}...`);
    
    const promises = [
      this.analyzeTwitterSentiment(symbol),
      this.analyzeRedditSentiment(symbol),
      this.analyzeNewsSentiment(symbol),
      this.analyzeTechnicalSentiment(symbol),
      this.analyzeSocialSentiment(symbol)
    ];

    const results = await Promise.allSettled(promises);
    
    // Process results
    const validResults = results
      .filter((result, index) => result.status === 'fulfilled' && this.config.sources[Object.keys(this.config.sources)[index]].enabled)
      .map(result => (result as PromiseFulfilledResult<SentimentData>).value);

    // Calculate weighted sentiment
    this.calculateWeightedSentiment(validResults);
    
    // Analyze trends
    this.analyzeTrends();
    
    // Generate trading signals
    this.generateSignals(symbol);
    
    // Update history
    this.updateHistory(validResults);
    
    this.currentSentiment.lastUpdated = new Date();
    
    console.log(`🤖 Sentiment: ${this.currentSentiment.overall > 0 ? 'Bullish' : 'Bearish'} (${(this.currentSentiment.overall * 100).toFixed(1)}%)`);
    
    return this.currentSentiment;
  }

  // Get sentiment-based trading signals
  getTradingSignals(symbol: string): Array<{
    signal: 'buy' | 'sell' | 'hold';
    confidence: number;
    reason: string;
    sentiment: number;
  }> {
    const signals: Array<{
      signal: 'buy' | 'sell' | 'hold';
      confidence: number;
      reason: string;
      sentiment: number;
    }> = [];

    const sentiment = this.currentSentiment.overall;
    const confidence = this.currentSentiment.confidence;

    // Strong bullish sentiment
    if (sentiment > 0.7 && confidence > this.config.minConfidence) {
      signals.push({
        signal: 'buy',
        confidence: confidence,
        reason: 'Strong bullish sentiment across all sources',
        sentiment: sentiment
      });
    }
    
    // Strong bearish sentiment
    else if (sentiment < -0.7 && confidence > this.config.minConfidence) {
      signals.push({
        signal: 'sell',
        confidence: confidence,
        reason: 'Strong bearish sentiment across all sources',
        sentiment: sentiment
      });
    }
    
    // Moderate signals
    else if (sentiment > 0.3 && confidence > this.config.minConfidence) {
      signals.push({
        signal: 'buy',
        confidence: confidence * 0.7,
        reason: 'Moderate bullish sentiment',
        sentiment: sentiment
      });
    }
    
    else if (sentiment < -0.3 && confidence > this.config.minConfidence) {
      signals.push({
        signal: 'sell',
        confidence: confidence * 0.7,
        reason: 'Moderate bearish sentiment',
        sentiment: sentiment
      });
    }
    
    // Sentiment reversal signals
    if (this.isSentimentReversing()) {
      const reversalSignal = sentiment > 0 ? 'buy' : 'sell';
      signals.push({
        signal: reversalSignal as 'buy' | 'sell',
        confidence: confidence * 0.8,
        reason: 'Sentiment reversal detected',
        sentiment: sentiment
      });
    }

    return signals;
  }

  // Check if sentiment is reversing
  private isSentimentReversing(): boolean {
    if (this.sentimentHistory.length < 6) return false;
    
    const recent = this.sentimentHistory.slice(-3).map(s => s.score);
    const previous = this.sentimentHistory.slice(-6, -3).map(s => s.score);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    return Math.abs(recentAvg - previousAvg) > 0.3;
  }

  // Calculate weighted sentiment from multiple sources
  private calculateWeightedSentiment(sentimentData: SentimentData[]): void {
    let totalWeight = 0;
    let weightedSum = 0;
    let totalConfidence = 0;
    let sourceCount = 0;

    // Group by source
    const sourceGroups = sentimentData.reduce((groups, data) => {
      if (!groups[data.source]) groups[data.source] = [];
      groups[data.source].push(data);
      return groups;
    }, {} as { [key: string]: SentimentData[] });

    // Calculate weighted sentiment for each source
    for (const [source, data] of Object.entries(sourceGroups)) {
      if (!this.config.sources[source as keyof typeof this.config.sources]?.enabled) continue;
      
      const sourceWeight = this.config.sources[source as keyof typeof this.config.sources].weight;
      const avgScore = data.reduce((sum, d) => sum + d.score, 0) / data.length;
      const avgConfidence = data.reduce((sum, d) => sum + d.confidence, 0) / data.length;
      
      weightedSum += avgScore * sourceWeight * avgConfidence;
      totalWeight += sourceWeight * avgConfidence;
      totalConfidence += avgConfidence;
      sourceCount++;
      
      // Update source-specific sentiment
      this.currentSentiment.sources[source as keyof typeof this.currentSentiment.sources] = avgScore;
    }

    // Calculate overall sentiment
    this.currentSentiment.overall = totalWeight > 0 ? weightedSum / totalWeight : 0;
    this.currentSentiment.confidence = sourceCount > 0 ? totalConfidence / sourceCount : 0;
  }

  // Analyze sentiment trends
  private analyzeTrends(): void {
    if (this.sentimentHistory.length < 10) return;

    const shortTerm = this.sentimentHistory.slice(-3);
    const mediumTerm = this.sentimentHistory.slice(-10);
    const longTerm = this.sentimentHistory.slice(-30);

    this.currentSentiment.trends.shortTerm = this.calculateTrend(shortTerm);
    this.currentSentiment.trends.mediumTerm = this.calculateTrend(mediumTerm);
    this.currentSentiment.trends.longTerm = this.calculateTrend(longTerm);
  }

  private calculateTrend(data: SentimentData[]): 'bullish' | 'bearish' | 'neutral' {
    if (data.length < 2) return 'neutral';
    
    const scores = data.map(d => d.score);
    const trend = scores[scores.length - 1] - scores[0];
    
    if (trend > 0.2) return 'bullish';
    if (trend < -0.2) return 'bearish';
    return 'neutral';
  }

  // Generate trading signals based on sentiment
  private generateSignals(symbol: string): void {
    this.currentSentiment.signals = [];
    
    const sentiment = this.currentSentiment.overall;
    const confidence = this.currentSentiment.confidence;
    
    if (sentiment > 0.5 && confidence > 0.7) {
      this.currentSentiment.signals.push(`Strong bullish sentiment for ${symbol}`);
    } else if (sentiment < -0.5 && confidence > 0.7) {
      this.currentSentiment.signals.push(`Strong bearish sentiment for ${symbol}`);
    }
    
    if (this.currentSentiment.trends.shortTerm === 'bullish' && this.currentSentiment.trends.mediumTerm === 'bullish') {
      this.currentSentiment.signals.push('Consistent bullish trend across timeframes');
    } else if (this.currentSentiment.trends.shortTerm === 'bearish' && this.currentSentiment.trends.mediumTerm === 'bearish') {
      this.currentSentiment.signals.push('Consistent bearish trend across timeframes');
    }
    
    if (this.isSentimentReversing()) {
      this.currentSentiment.signals.push('Sentiment reversal detected - potential opportunity');
    }
  }

  // Update sentiment history
  private updateHistory(sentimentData: SentimentData[]): void {
    this.sentimentHistory.push(...sentimentData);
    
    // Remove old data
    const cutoff = new Date(Date.now() - this.config.historyLength);
    this.sentimentHistory = this.sentimentHistory.filter(data => data.timestamp > cutoff);
  }

  // Individual source analyzers (simplified implementations)
  private async analyzeTwitterSentiment(symbol: string): Promise<SentimentData> {
    // Simulate Twitter sentiment analysis
    const score = Math.random() * 2 - 1; // -1 to 1
    return {
      source: 'twitter',
      score,
      confidence: 0.7 + Math.random() * 0.3,
      timestamp: new Date(),
      keywords: [symbol, 'crypto', 'trading']
    };
  }

  private async analyzeRedditSentiment(symbol: string): Promise<SentimentData> {
    // Simulate Reddit sentiment analysis
    const score = Math.random() * 2 - 1;
    return {
      source: 'reddit',
      score,
      confidence: 0.6 + Math.random() * 0.4,
      timestamp: new Date(),
      keywords: [symbol, 'cryptocurrency', 'investing']
    };
  }

  private async analyzeNewsSentiment(symbol: string): Promise<SentimentData> {
    // Simulate news sentiment analysis
    const score = Math.random() * 2 - 1;
    return {
      source: 'news',
      score,
      confidence: 0.8 + Math.random() * 0.2,
      timestamp: new Date(),
      keywords: [symbol, 'market', 'analysis']
    };
  }

  private async analyzeTechnicalSentiment(symbol: string): Promise<SentimentData> {
    // Simulate technical analysis sentiment
    const score = Math.random() * 2 - 1;
    return {
      source: 'technical',
      score,
      confidence: 0.7 + Math.random() * 0.3,
      timestamp: new Date(),
      keywords: [symbol, 'technical', 'indicators']
    };
  }

  private async analyzeSocialSentiment(symbol: string): Promise<SentimentData> {
    // Simulate social media sentiment analysis
    const score = Math.random() * 2 - 1;
    return {
      source: 'social',
      score,
      confidence: 0.5 + Math.random() * 0.5,
      timestamp: new Date(),
      keywords: [symbol, 'social', 'media']
    };
  }

  // Get current sentiment state
  getCurrentSentiment(): MarketSentiment {
    return { ...this.currentSentiment };
  }

  // Manual override for human intervention
  setManualSentiment(sentiment: number, reason: string): void {
    console.log(`👤 Human Override: Setting sentiment to ${sentiment} - ${reason}`);
    this.currentSentiment.overall = Math.max(-1, Math.min(1, sentiment));
    this.currentSentiment.confidence = 0.9; // High confidence for manual override
    this.currentSentiment.signals.push(`Manual override: ${reason}`);
  }
} 