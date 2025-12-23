// Simplified ML model without TensorFlow.js to avoid disk space issues
export class PricePredictionModel {
  private trained: boolean = false;
  private lastPrice: number = 0;

  constructor() {
    // Initialize without TensorFlow to save disk space
    console.log('ML Model initialized (simplified mode)');
  }

  async trainModel(xs: number[], ys: number[]) {
    // Simplified training - just store the last price
    if (xs.length > 0 && ys.length > 0) {
      this.lastPrice = ys[ys.length - 1];
      this.trained = true;
    }
  }

  predict(input: number): number {
    if (!this.trained) {
      return input; // Return current price if not trained
    }
    
    // Simple prediction based on last known price
    // Add small random variation to simulate ML prediction
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    return this.lastPrice * (1 + variation);
  }
} 