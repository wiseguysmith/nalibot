export interface QuantSignalResponse {
  symbol: string;
  timestamp: string;
  signal: number;
  components?: {
    speed?: number;
    alt_data?: number;
    microstructure?: number;
    options_flow?: number;
    volatility?: number;
  };
  latency_ms?: number;
}

