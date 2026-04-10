"""
NaliBot — ML Model Trainer
Fetches historical XRPUSD OHLC from Kraken, engineers the exact 8 features
that MLSignal.predict() expects, trains a RandomForestClassifier, and saves
to models/signal_model.pkl.

Features (must match bot.py compute_indicators exactly):
  rsi, ema_diff, vol_ratio, bb_pct, volatility, macd_hist, momentum, high_low_pct

Label: 1 if price 5 bars later is >= +0.5% from current close, else 0
"""

import os, pickle, requests, time
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

KRAKEN_BASE = "https://api.kraken.com"
MODEL_FILE  = os.path.join(os.path.dirname(__file__), "models", "signal_model.pkl")
FEATURES    = ["rsi", "ema_diff", "vol_ratio", "bb_pct", "volatility", "macd_hist", "momentum", "high_low_pct"]


# ── Fetch OHLC ────────────────────────────────────────────────────────────────

def fetch_ohlc(pair="XRPUSD", interval=5, since=None):
    params = {"pair": pair, "interval": interval}
    if since:
        params["since"] = since
    try:
        r = requests.get(f"{KRAKEN_BASE}/0/public/OHLC", params=params, timeout=15)
        data = r.json()
        if data.get("error"):
            print("Kraken error:", data["error"])
            return pd.DataFrame()
        key = [k for k in data["result"] if k != "last"]
        if not key:
            return pd.DataFrame()
        rows = data["result"][key[0]]
        df = pd.DataFrame(rows, columns=["time","open","high","low","close","vwap","volume","count"])
        for col in ["open","high","low","close","vwap","volume"]:
            df[col] = pd.to_numeric(df[col])
        df["time"] = pd.to_datetime(df["time"], unit="s")
        return df
    except Exception as e:
        print(f"Fetch error: {e}")
        return pd.DataFrame()


def fetch_large_ohlc(pair="XRPUSD", interval=5, num_batches=4):
    """Fetch multiple batches (Kraken returns 720 candles max per call)."""
    all_dfs = []
    since = None

    # Compute oldest `since` timestamp so we walk forward
    # 720 candles × 5 min = 3600 min = 2.5 days per batch
    # 4 batches ≈ 10 days of 5-min data
    import time as _time
    since = int(_time.time()) - num_batches * 720 * interval * 60

    for i in range(num_batches):
        print(f"  Fetching batch {i+1}/{num_batches}...")
        df = fetch_ohlc(pair=pair, interval=interval, since=since)
        if df.empty:
            break
        all_dfs.append(df)
        since = int(df["time"].iloc[-1].timestamp()) + 1
        time.sleep(1.2)   # respect rate limit

    if not all_dfs:
        return pd.DataFrame()
    combined = pd.concat(all_dfs).drop_duplicates("time").sort_values("time").reset_index(drop=True)
    print(f"  Total candles: {len(combined)}")
    return combined


# ── Feature engineering ───────────────────────────────────────────────────────

def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    c = df["close"]
    v = df["volume"]

    # RSI-14
    delta = c.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rsi   = 100 - 100 / (1 + gain / loss.replace(0, 1e-9))

    # EMA diff
    ema9  = c.ewm(span=9,  adjust=False).mean()
    ema21 = c.ewm(span=21, adjust=False).mean()
    ema_diff = (ema9 - ema21) / c

    # MACD histogram
    ema12 = c.ewm(span=12, adjust=False).mean()
    ema26 = c.ewm(span=26, adjust=False).mean()
    macd_line   = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist   = macd_line - signal_line

    # Bollinger Band %
    mid    = c.rolling(20).mean()
    std    = c.rolling(20).std()
    upper  = mid + 2 * std
    lower  = mid - 2 * std
    bb_w   = upper - lower
    bb_pct = (c - lower) / bb_w.replace(0, 1e-9)

    # Volume ratio
    vol_avg   = v.rolling(20).mean()
    vol_ratio = v / vol_avg.replace(0, 1e-9)

    # Volatility (14-bar rolling std of % returns × √14)
    pct_ret    = c.pct_change()
    volatility = pct_ret.rolling(14).std() * np.sqrt(14)

    # Momentum (5-bar)
    momentum = c / c.shift(5) - 1

    # High-low %
    high_low_pct = (df["high"] - df["low"]) / c

    feat = pd.DataFrame({
        "rsi":          rsi,
        "ema_diff":     ema_diff,
        "vol_ratio":    vol_ratio,
        "bb_pct":       bb_pct,
        "volatility":   volatility,
        "macd_hist":    macd_hist,
        "momentum":     momentum,
        "high_low_pct": high_low_pct,
    })
    return feat


def make_labels(df: pd.DataFrame, horizon=5, threshold=0.005) -> pd.Series:
    """1 if price rises >= threshold% within `horizon` bars, else 0."""
    future_max = df["close"].shift(-horizon).rolling(horizon).max()
    return (future_max / df["close"] - 1 >= threshold).astype(int)


# ── Train ─────────────────────────────────────────────────────────────────────

def train():
    print("\n=== NaliBot ML Trainer ===\n")

    print("Fetching XRPUSD 5-min OHLC from Kraken (~20 days)...")
    df = fetch_large_ohlc(pair="XRPUSD", interval=5, num_batches=8)
    if len(df) < 200:
        print("Not enough data to train. Check your connection.")
        return

    print("Engineering features...")
    feat  = compute_features(df)
    label = make_labels(df)

    combined = pd.concat([feat, label.rename("label")], axis=1).dropna()
    X = combined[FEATURES].values
    y = combined["label"].values

    print(f"Dataset: {len(X)} samples | Class balance: {y.mean()*100:.1f}% bullish")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    print("Training RandomForest...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=20,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train_s, y_train)

    print("\n--- Validation Report ---")
    y_pred = model.predict(X_test_s)
    print(classification_report(y_test, y_pred, target_names=["Bearish", "Bullish"]))

    importances = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
    print("Feature importances:")
    for name, imp in importances:
        bar = "#" * int(imp * 40)
        print(f"  {name:<16} {bar} {imp:.3f}")

    os.makedirs(os.path.dirname(MODEL_FILE), exist_ok=True)
    pickle.dump({"model": model, "scaler": scaler, "features": FEATURES}, open(MODEL_FILE, "wb"))
    print(f"\n[OK] Model saved -> {MODEL_FILE}")


if __name__ == "__main__":
    train()
