import dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
  ENV: process.env.NODE_ENV ?? "development",

  // Exchanges
  KRAKEN_API_KEY: process.env.KRAKEN_API_KEY ?? "",
  KRAKEN_API_SECRET: process.env.KRAKEN_API_SECRET ?? "",

  KUCOIN_API_KEY: process.env.KUCOIN_API_KEY ?? "",
  KUCOIN_API_SECRET: process.env.KUCOIN_API_SECRET ?? "",
  KUCOIN_API_PASSPHRASE: process.env.KUCOIN_API_PASSPHRASE ?? "",

  // Coinbase Advanced Trade JWT (ECDSA) - NOT legacy HMAC
  COINBASE_JWT_KEY_ID: process.env.COINBASE_JWT_KEY_ID ?? "",
  COINBASE_JWT_PRIVATE_KEY: process.env.COINBASE_JWT_PRIVATE_KEY ?? "",

  // Quant Server (Python)
  PYTHON_API_URL: process.env.PYTHON_API_URL ?? "http://localhost:8000",

  // Trading defaults
  POLLING_INTERVAL_MS: Number(process.env.POLLING_INTERVAL_MS ?? 1000),
  RISK_LIMIT_DAILY_LOSS: Number(process.env.RISK_LIMIT_DAILY_LOSS ?? 0.03),
  MAX_POSITION_SIZE: Number(process.env.MAX_POSITION_SIZE ?? 0.1),

  // Database
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./autobread.db",

  // Quant API Configuration
  QUANT_TIMEOUT_MS: Number(process.env.QUANT_TIMEOUT_MS ?? 2000),
  QUANT_RETRY_COUNT: Number(process.env.QUANT_RETRY_COUNT ?? 3),
  QUANT_SIGNAL_WEIGHT: Number(process.env.QUANT_SIGNAL_WEIGHT ?? 0.5),
  TRADITIONAL_SIGNAL_WEIGHT: Number(process.env.TRADITIONAL_SIGNAL_WEIGHT ?? 0.5),

  // Risk Management
  MAX_DAILY_TRADES: Number(process.env.MAX_DAILY_TRADES ?? 50),
  MAX_DRAWDOWN_PERCENTAGE: Number(process.env.MAX_DRAWDOWN_PERCENTAGE ?? 25),
  RISK_PER_TRADE_PERCENTAGE: Number(process.env.RISK_PER_TRADE_PERCENTAGE ?? 20),
  VOLATILITY_LOOKBACK_PERIOD: Number(process.env.VOLATILITY_LOOKBACK_PERIOD ?? 14),

  // Notifications
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? "",
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ?? "",
  NOTIFICATION_PHONE_NUMBER: process.env.NOTIFICATION_PHONE_NUMBER ?? "",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? "",

  // External Data
  EXTERNAL_DATA_ENABLED: process.env.EXTERNAL_DATA_ENABLED === "true",
  GOOGLE_TRENDS_ENABLED: process.env.GOOGLE_TRENDS_ENABLED === "true",
  GITHUB_API_KEY: process.env.GITHUB_API_KEY ?? "",

  // Trading Pairs
  KRAKEN_PAIR_DEFAULT: process.env.KRAKEN_PAIR_DEFAULT ?? "BTC/USDT",
  DEFAULT_EXCHANGE: process.env.DEFAULT_EXCHANGE ?? "binance",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL ?? "INFO",
} as const;

// Validate critical configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (CONFIG.ENV === "production") {
    if (!CONFIG.KRAKEN_API_KEY && !CONFIG.KUCOIN_API_KEY && !CONFIG.COINBASE_JWT_KEY_ID) {
      errors.push("At least one exchange API key is required in production");
    }
    // Validate Coinbase JWT credentials if provided
    if (CONFIG.COINBASE_JWT_KEY_ID || CONFIG.COINBASE_JWT_PRIVATE_KEY) {
      if (!CONFIG.COINBASE_JWT_KEY_ID) {
        errors.push("COINBASE_JWT_KEY_ID is required when using Coinbase JWT authentication");
      }
      if (!CONFIG.COINBASE_JWT_PRIVATE_KEY) {
        errors.push("COINBASE_JWT_PRIVATE_KEY is required when using Coinbase JWT authentication");
      }
    }
    if (!CONFIG.DATABASE_URL || CONFIG.DATABASE_URL.includes("file:")) {
      errors.push("Production requires PostgreSQL DATABASE_URL");
    }
  }

  if (CONFIG.RISK_LIMIT_DAILY_LOSS <= 0 || CONFIG.RISK_LIMIT_DAILY_LOSS > 1) {
    errors.push("RISK_LIMIT_DAILY_LOSS must be between 0 and 1");
  }

  if (CONFIG.MAX_POSITION_SIZE <= 0 || CONFIG.MAX_POSITION_SIZE > 1) {
    errors.push("MAX_POSITION_SIZE must be between 0 and 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

