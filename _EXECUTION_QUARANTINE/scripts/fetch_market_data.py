import pandas as pd
import ccxt

# Initialize Kraken Exchange API
kraken = ccxt.kraken()

# Fetch BTC/USDT market data
bars = kraken.fetch_ohlcv("BTC/USDT", timeframe="1h", limit=500)

# Convert to DataFrame
df = pd.DataFrame(bars, columns=["timestamp", "open", "high", "low", "close", "volume"])

# Convert timestamp to readable date
df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")

# Save to CSV
df.to_csv("btc_usdt_data.csv", index=False)

print("✅ Market data saved as btc_usdt_data.csv!")
