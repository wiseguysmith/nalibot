/**
 * Quant API Client (TS → Python)
 * POST requests to Python FastAPI Quant Server
 * Handles timeout, retry, backoff
 */

import axios, { AxiosError } from "axios";
import { CONFIG } from "../../config";

export interface QuantSignals {
  speed: number;
  microstructure: number;
  oi: number;
  options: number;
  sentiment: number;
  volatility: number;
  combined: number;
}

export interface QuantRequestPayload {
  symbol: string;
  candles?: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  timestamp: number;
}

export interface QuantResponse {
  signals: QuantSignals;
  latency_ms: number;
  timestamp: string;
}

export class QuantApiClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.baseUrl = CONFIG.PYTHON_API_URL;
    this.timeout = CONFIG.QUANT_TIMEOUT_MS;
    this.maxRetries = CONFIG.QUANT_RETRY_COUNT;
    this.retryDelay = 1000; // 1 second base delay
  }

  /**
   * Get quant signals from Python API
   */
  async getQuantSignals(
    symbol: string,
    candles?: Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>
  ): Promise<QuantSignals> {
    const payload: QuantRequestPayload = {
      symbol,
      candles,
      timestamp: Date.now(),
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const response = await axios.post<QuantResponse>(
          `${this.baseUrl}/signals`,
          payload,
          {
            timeout: this.timeout,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const latency = Date.now() - start;
        console.log(
          `[QUANT API] Signals received for ${symbol} - Latency: ${latency}ms`
        );
        console.log(
          `[QUANT API] Combined signal: ${response.data.signals.combined.toFixed(3)}`
        );

        return response.data.signals;
      } catch (error) {
        const axiosError = error as AxiosError;
        const latency = Date.now() - start;

        if (attempt === this.maxRetries) {
          console.error(
            `[QUANT API] Failed after ${attempt} attempts:`,
            axiosError.message
          );
          // Return neutral signals on failure
          return this.getNeutralSignals();
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(
          `[QUANT API] Attempt ${attempt} failed, retrying in ${delay}ms...`
        );
        await this.delay(delay);
      }
    }

    return this.getNeutralSignals();
  }

  /**
   * Get neutral signals for fallback
   */
  private getNeutralSignals(): QuantSignals {
    return {
      speed: 0,
      microstructure: 0,
      oi: 0,
      options: 0,
      sentiment: 0,
      volatility: 0.5, // Neutral volatility (0.5 = no prediction)
      combined: 0,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
let quantApiClientInstance: QuantApiClient | null = null;

export function getQuantApiClient(): QuantApiClient {
  if (!quantApiClientInstance) {
    quantApiClientInstance = new QuantApiClient();
  }
  return quantApiClientInstance;
}

