"""
NaliBot — 10 Paper Trades Simulator
Replays recent XRPUSD history bar-by-bar using the same signal logic as
bot.py, executes up to 10 complete paper trades (entry + exit), then
prints a full P&L summary and writes state.json so the dashboard updates.
"""

import os, json, pickle, requests, time
import numpy as np
import pandas as pd
from datetime import datetime

KRAKEN_BASE  = "https://api.kraken.com"
MODEL_FILE   = os.path.join(os.path.dirname(__file__), "models", "signal_model.pkl")
STATE_FILE   = os.path.join(os.path.dirname(__file__), "state.json")
FEATURES     = ["rsi", "ema_diff", "vol_ratio", "bb_pct", "volatility", "macd_hist", "momentum", "high_low_pct"]

# ── Mirrored constants from bot.py ────────────────────────────────────────────
PAPER_BALANCE    = 1000.0
RISK_PER_TRADE   = 0.08
TAKE_PROFIT_PCT  = 0.025
TRAIL_PCT        = 0.012
HARD_FLOOR_PCT   = 0.025
RSI_OVERSOLD     = 42
RSI_OVERBOUGHT   = 58
MIN_SIGNAL_CONF  = 0.25
NET_SCORE_NEEDED = 1
ML_WEIGHT        = 0.30
TARGET_TRADES    = 10


# ── Kraken helpers ────────────────────────────────────────────────────────────

def fetch_ohlc(pair="XRPUSD", interval=5, since=None):
    params = {"pair": pair, "interval": interval}
    if since:
        params["since"] = since
    try:
        r = requests.get(f"{KRAKEN_BASE}/0/public/OHLC", params=params, timeout=15)
        data = r.json()
        if data.get("error"):
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


def fetch_data(pair="XRPUSD", interval=5, batches=4):
    all_dfs = []
    since = int(time.time()) - batches * 720 * interval * 60
    for i in range(batches):
        df = fetch_ohlc(pair=pair, interval=interval, since=since)
        if df.empty:
            break
        all_dfs.append(df)
        since = int(df["time"].iloc[-1].timestamp()) + 1
        time.sleep(1.0)
    if not all_dfs:
        return pd.DataFrame()
    return pd.concat(all_dfs).drop_duplicates("time").sort_values("time").reset_index(drop=True)


# ── ML loader ─────────────────────────────────────────────────────────────────

def load_ml():
    try:
        data = pickle.load(open(MODEL_FILE, "rb"))
        print("✅ ML model loaded")
        return data["model"], data["scaler"]
    except Exception as e:
        print(f"⚠️  ML model not loaded ({e}) — using neutral 0.5")
        return None, None


def ml_predict(model, scaler, ind):
    if model is None:
        return 0.5
    try:
        row = [[ind["rsi"], ind["ema_diff"], ind["vol_ratio"], ind["bb_pct"],
                ind["volatility"], ind["macd_hist"], ind["momentum"], ind["high_low_pct"]]]
        X = scaler.transform(row)
        return float(model.predict_proba(X)[0][1])
    except:
        return 0.5


# ── Indicators (mirror of bot.py compute_indicators) ─────────────────────────

def compute_indicators(df):
    c = df["close"]
    v = df["volume"]

    delta = c.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rsi   = float((100 - 100 / (1 + gain / loss.replace(0, 1e-9))).iloc[-1])

    ema9  = c.ewm(span=9,  adjust=False).mean()
    ema21 = c.ewm(span=21, adjust=False).mean()
    ema12 = c.ewm(span=12, adjust=False).mean()
    ema26 = c.ewm(span=26, adjust=False).mean()
    macd_line   = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist   = float((macd_line - signal_line).iloc[-1])

    mid    = c.rolling(20).mean()
    std    = c.rolling(20).std()
    upper  = mid + 2 * std
    lower  = mid - 2 * std
    price  = float(c.iloc[-1])
    bb_w   = float((upper - lower).iloc[-1])
    bb_pct = float((price - lower.iloc[-1]) / (bb_w if bb_w > 0 else 1))

    vol_ratio  = float(v.iloc[-1] / v.tail(20).mean()) if v.tail(20).mean() > 0 else 1.0
    volatility = float(c.pct_change().tail(14).std() * np.sqrt(14))
    momentum   = float((c.iloc[-1] / c.iloc[-6] - 1) if len(c) > 5 else 0)
    hl_pct     = float((df["high"].iloc[-1] - df["low"].iloc[-1]) / price)

    return {
        "price": price, "rsi": rsi, "macd_hist": macd_hist,
        "macd": float(macd_line.iloc[-1]), "macd_signal": float(signal_line.iloc[-1]),
        "bb_pct": bb_pct, "bb_width": bb_w,
        "ema9": float(ema9.iloc[-1]), "ema21": float(ema21.iloc[-1]),
        "ema_diff": float((ema9.iloc[-1] - ema21.iloc[-1]) / price),
        "vol_ratio": vol_ratio, "volatility": volatility,
        "momentum": momentum, "high_low_pct": hl_pct,
    }


# ── Signal engine (mirror of bot.py generate_signal, simplified) ──────────────

def generate_signal(ind, ml_prob):
    bullish, bearish, reasons = 0, 0, []
    rsi    = ind["rsi"]
    macd_h = ind["macd_hist"]
    bb_pct = ind["bb_pct"]

    if rsi < RSI_OVERSOLD:
        bullish += 1; reasons.append(f"RSI oversold {rsi:.1f}")
    elif rsi > RSI_OVERBOUGHT:
        bearish += 1; reasons.append(f"RSI overbought {rsi:.1f}")

    if macd_h > 0 and ind["macd"] > ind["macd_signal"]:
        bullish += 1; reasons.append(f"MACD bullish ({macd_h:+.5f})")
    elif macd_h < 0 and ind["macd"] < ind["macd_signal"]:
        bearish += 1; reasons.append(f"MACD bearish ({macd_h:+.5f})")

    if bb_pct < 0.2:
        bullish += 1; reasons.append(f"Near lower BB ({bb_pct:.2f})")
    elif bb_pct > 0.8:
        bearish += 1; reasons.append(f"Near upper BB ({bb_pct:.2f})")

    if ind["ema_diff"] > 0:
        bullish += 1; reasons.append("EMA9 > EMA21")
    elif ind["ema_diff"] < 0:
        bearish += 1; reasons.append("EMA9 < EMA21")

    if ind["momentum"] > 0.005:
        bullish += 1; reasons.append(f"Momentum +{ind['momentum']*100:.2f}%")
    elif ind["momentum"] < -0.005:
        bearish += 1; reasons.append(f"Momentum {ind['momentum']*100:.2f}%")

    if ind["vol_ratio"] > 1.5:
        if bullish > bearish:
            bullish += 1; reasons.append(f"Vol spike {ind['vol_ratio']:.1f}x (bull)")
        else:
            bearish += 1; reasons.append(f"Vol spike {ind['vol_ratio']:.1f}x (bear)")

    ml_boost = (ml_prob - 0.5) * 2 * ML_WEIGHT
    net = (bullish - bearish) + ml_boost

    total     = max(bullish + bearish, 1)
    raw_conf  = abs(net) / (total + ML_WEIGHT)
    confidence = float(np.clip(raw_conf, 0, 1))

    if net >= NET_SCORE_NEEDED and confidence >= MIN_SIGNAL_CONF:
        action = "BUY"
    elif net <= -NET_SCORE_NEEDED and confidence >= MIN_SIGNAL_CONF:
        action = "SELL"
    else:
        action = "HOLD"

    return {
        "action": action, "confidence": round(confidence, 3),
        "ml_prob": round(ml_prob, 3), "bullish": bullish,
        "bearish": bearish, "net": round(net, 3),
        "reasons": reasons,
    }


# ── Paper Trader ──────────────────────────────────────────────────────────────

class PaperTrader:
    def __init__(self, balance):
        self.balance   = balance
        self.positions = {}
        self.trade_log = []
        self.wins = self.losses = 0

    def enter(self, pair, price, size_usd, sig):
        if pair in self.positions:
            return None
        size_usd = min(size_usd, self.balance * 0.95)
        if size_usd < 1.0:
            return None
        units = size_usd / price
        self.balance -= size_usd
        self.positions[pair] = {
            "size": units, "entry": price, "cost": size_usd,
            "peak_price": price, "open_time": datetime.now().isoformat(),
        }
        trade = {
            "id": len(self.trade_log) + 1, "pair": pair,
            "action": "BUY", "price": price,
            "size_usd": round(size_usd, 2), "units": round(units, 4),
            "confidence": sig["confidence"], "ml_prob": sig["ml_prob"],
            "sentiment": 0.0, "time": datetime.now().isoformat(),
            "pnl": None, "pnl_pct": None, "status": "OPEN",
            "reasons": sig["reasons"],
        }
        self.trade_log.append(trade)
        return trade

    def check_exits(self, pair, price):
        if pair not in self.positions:
            return None
        pos   = self.positions[pair]
        entry = pos["entry"]
        if price > pos["peak_price"]:
            pos["peak_price"] = price
        peak      = pos["peak_price"]
        change    = (price - entry) / entry
        from_peak = (price - peak) / peak
        reason = None
        if change >= TAKE_PROFIT_PCT:
            reason = f"TP +{change*100:.2f}%"
        elif from_peak <= -TRAIL_PCT:
            reason = f"Trail stop {from_peak*100:.2f}% from peak"
        elif change <= -HARD_FLOOR_PCT:
            reason = f"Hard floor {change*100:.2f}%"
        if reason:
            value = pos["size"] * price
            pnl   = value - pos["cost"]
            self.balance += value
            if pnl >= 0: self.wins += 1
            else:         self.losses += 1
            del self.positions[pair]
            closed = {
                "id": len(self.trade_log) + 1, "pair": pair,
                "action": "SELL", "price": price,
                "size_usd": round(value, 2), "units": round(pos["size"], 4),
                "confidence": 0.0, "ml_prob": 0.0, "sentiment": 0.0,
                "time": datetime.now().isoformat(),
                "pnl": round(pnl, 4), "pnl_pct": round(pnl / pos["cost"] * 100, 2),
                "status": "CLOSED",
                "reasons": [reason, f"Entry: ${entry:.4f}", f"Exit: ${price:.4f}"],
            }
            self.trade_log.append(closed)
            return closed, reason
        return None


# ── State writer ──────────────────────────────────────────────────────────────

def write_state(trader, last_ind, trade_log):
    state = {
        "lastUpdate": datetime.now().isoformat(),
        "portfolio": {
            "balance":       round(trader.balance, 2),
            "pnl":           round(trader.balance - PAPER_BALANCE, 2),
            "pnlPct":        round((trader.balance - PAPER_BALANCE) / PAPER_BALANCE * 100, 2),
            "winRate":       round(trader.wins / max(trader.wins + trader.losses, 1) * 100, 1),
            "trades":        trader.wins + trader.losses,
            "wins":          trader.wins,
            "losses":        trader.losses,
            "openPositions": len(trader.positions),
        },
        "signals":   {},
        "prices":    {"XRPUSD": last_ind.get("price", 0)},
        "trades":    trade_log[-50:],
        "btcFilter": {"block": 0, "reason": "Simulation mode"},
        "fearGreed": 50,
    }
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


# ── Main simulation ───────────────────────────────────────────────────────────

def run():
    print("\n=== NaliBot — 10 Paper Trades Simulation ===\n")

    model, scaler = load_ml()

    print("Fetching XRPUSD historical data...")
    df = fetch_data(pair="XRPUSD", interval=5, batches=4)
    if len(df) < 100:
        print("Not enough data. Check connection.")
        return

    print(f"Got {len(df)} candles | {df['time'].iloc[0]} → {df['time'].iloc[-1]}\n")

    trader        = PaperTrader(PAPER_BALANCE)
    completed     = 0
    WIN           = "\033[92m"
    LOSS          = "\033[91m"
    RESET         = "\033[0m"
    BOLD          = "\033[1m"

    print(f"{'#':>3}  {'Time':19}  {'Pair':8}  {'Action':6}  {'Price':>8}  {'Size$':>7}  {'P&L':>8}  {'Reason'}")
    print("─" * 95)

    for i in range(50, len(df) - 10):
        window = df.iloc[i-50:i+1].copy()
        ind    = compute_indicators(window)
        price  = ind["price"]
        ml_p   = ml_predict(model, scaler, ind)
        sig    = generate_signal(ind, ml_p)
        bar_time = df["time"].iloc[i].strftime("%Y-%m-%d %H:%M")

        # Check exits first on any open position
        for pair in list(trader.positions.keys()):
            result = trader.check_exits(pair, price)
            if result:
                closed, reason = result
                completed += 1
                pnl_col = WIN if closed["pnl"] >= 0 else LOSS
                print(f"{completed:>3}  {bar_time:19}  {pair:8}  {BOLD}EXIT  {RESET}"
                      f"  ${price:>7.4f}  ${closed['size_usd']:>6.2f}  "
                      f"{pnl_col}${closed['pnl']:>+7.4f}{RESET}  {reason}")
                write_state(trader, ind, trader.trade_log)

        if completed >= TARGET_TRADES:
            break

        # Enter new position on BUY signal
        if sig["action"] == "BUY" and "XRPUSD" not in trader.positions:
            size_usd = round(trader.balance * RISK_PER_TRADE * sig["confidence"], 2)
            trade = trader.enter("XRPUSD", price, size_usd, sig)
            if trade:
                print(f"     {bar_time:19}  XRPUSD   {BOLD}ENTER {RESET}"
                      f"  ${price:>7.4f}  ${trade['size_usd']:>6.2f}  {'':>8}  "
                      f"conf={sig['confidence']:.2f} ml={sig['ml_prob']:.2f}")
                write_state(trader, ind, trader.trade_log)

    # Force-close any remaining open positions at last price
    if trader.positions and completed < TARGET_TRADES:
        last_price = float(df["close"].iloc[-1])
        for pair in list(trader.positions.keys()):
            result = trader.check_exits(pair, last_price)
            if not result:
                # Manual close
                pos = trader.positions[pair]
                value = pos["size"] * last_price
                pnl   = value - pos["cost"]
                trader.balance += value
                if pnl >= 0: trader.wins += 1
                else:         trader.losses += 1
                del trader.positions[pair]
                completed += 1
                pnl_col = WIN if pnl >= 0 else LOSS
                print(f"{completed:>3}  {'end':19}  {pair:8}  {BOLD}CLOSE {RESET}"
                      f"  ${last_price:>7.4f}  ${value:>6.2f}  "
                      f"{pnl_col}${pnl:>+7.4f}{RESET}  Simulation end")

    # ── Summary ───────────────────────────────────────────────────────────────
    pnl   = trader.balance - PAPER_BALANCE
    wrate = trader.wins / max(trader.wins + trader.losses, 1) * 100
    print("\n" + "═" * 95)
    print(f"  {BOLD}PAPER TRADE SUMMARY{RESET}")
    print(f"  Start Balance : ${PAPER_BALANCE:,.2f}")
    print(f"  End Balance   : ${trader.balance:,.2f}")
    pnl_col = WIN if pnl >= 0 else LOSS
    print(f"  Net P&L       : {pnl_col}${pnl:+,.4f}  ({pnl/PAPER_BALANCE*100:+.2f}%){RESET}")
    print(f"  Trades        : {completed}  ({trader.wins}W / {trader.losses}L)  Win Rate: {wrate:.1f}%")
    print("═" * 95)

    write_state(trader, ind, trader.trade_log)
    print(f"\n✅ state.json updated — refresh the dashboard to see results.")


if __name__ == "__main__":
    run()
