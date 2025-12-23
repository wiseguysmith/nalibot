// ML Strategy temporarily disabled - TensorFlow dependency not installed
// To enable: npm install @tensorflow/tfjs

interface PredictionInput {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

interface PredictionOutput {
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  priceTarget: number;
}

export class MLStrategy {
  private isTrained: boolean = false;

  constructor() {
    console.log('⚠️ ML Strategy disabled - TensorFlow not installed');
  }

  async trainModel(historicalData: any[]): Promise<void> {
    console.log('⚠️ ML training disabled');
  }

  async predict(input: PredictionInput): Promise<PredictionOutput> {
    return {
      direction: 'HOLD',
      confidence: 0,
      priceTarget: 0
    };
  }

  isModelReady(): boolean {
    return false;
  }
}

export class MLTradingStrategy {
  private initialized: boolean = false;

  constructor() {
    console.log('⚠️ ML Trading Strategy disabled - TensorFlow not installed');
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    console.log('⚠️ ML Strategy initialized (disabled mode)');
  }

  async predict(data: PredictionInput): Promise<{
    action: 'buy' | 'sell' | 'hold';
    confidence: number;
  }> {
    return {
      action: 'hold',
      confidence: 0
    };
  }

  async train(trainingData: {
    features: PredictionInput;
    labels: number[];
  }): Promise<void> {
    console.log('⚠️ ML training disabled');
  }
}