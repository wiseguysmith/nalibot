"""
NaliBot — Main Orchestrator Loop v3
Changes vs v2:
  - 60-second loop interval (was 5 min) → more cycles, more trades
  - Auto take-profit (+2%) and stop-loss (-1%) checked every loop
  - Confidence threshold 0.25 (was 0.35) → fires on weaker signals
  - NET_SCORE_NEEDED = 1 (unchanged)
  - Positions allow re-entry after TP/SL close
  - Persistent state across restarts
"""

import os, time, json, hmac, hashlib, base64, urllib.parse
import logging, requests, pickle
import numpy as np
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv

# ── Env ───────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'ai-trading-bot', '.env.local'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'config', 'production.env'))

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('bot.log', encoding='utf-8')]
)
log = logging.getLogger('NaliBot')

# ── Config ────────────────────────────────────────────────────────────────────
KRAKEN_API_KEY    = os.getenv('KRAKEN_API_KEY', '')
KRAKEN_API_SECRET = os.getenv('KRAKEN_API_SECRET', '')
TELEGRAM_TOKEN    = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID  = os.getenv('TELEGRAM_CHAT_ID', '')
KRAKEN_BASE       = 'https://api.kraken.com'
STATE_FILE        = os.path.join(os.path.dirname(__file__), 'state.json')
MODEL_FILE        = os.path.join(os.path.dirname(__file__), 'models', 'signal_model.pkl')

TRADING_PAIRS     = ['XRPUSD', 'XRPUSDT']
LOOP_INTERVAL_SEC = 60      # 60s loops (was 300)
PAPER_BALANCE     = 1000.0

# ── THRESHOLDS ────────────────────────────────────────────────────────────────
MIN_SIGNAL_CONF   = 0.25
RSI_OVERSOLD      = 42
RSI_OVERBOUGHT    = 58
NET_SCORE_NEEDED  = 1
RISK_PER_TRADE    = 0.08
MAX_DAILY_LOSS    = 0.15
MAX_DRAWDOWN      = 0.20
ML_WEIGHT         = 0.30

# ── AUTO EXIT RULES ───────────────────────────────────────────────────────────
TAKE_PROFIT_PCT   = 0.020   # close at +2%
STOP_LOSS_PCT     = 0.010   # close at -1%


# ══════════════════════════════════════════════════════════════════════════════
# STATE
# ══════════════════════════════════════════════════════════════════════════════

def save_state(trader, signals: dict, last_prices: dict):
    state = {
        "lastUpdate": datetime.now().isoformat(),
        "portfolio": {
            "balance":       round(trader.balance, 2),
            "pnl":           round(trader.total_pnl, 2),
            "pnlPct":        round((trader.total_pnl / PAPER_BALANCE) * 100, 2),
            "winRate":       round(trader.win_rate, 1),
            "trades":        trader.wins + trader.losses,
            "wins":          trader.wins,
            "losses":        trader.losses,
            "openPositions": len(trader.positions),
        },
        "signals": signals,
        "prices":  last_prices,
        "trades":  trader.trade_log[-50:],
    }
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


# ══════════════════════════════════════════════════════════════════════════════
# ML MODEL
# ══════════════════════════════════════════════════════════════════════════════

class MLSignal:
    def __init__(self):
        self.loaded = False
        self.model  = None
        self.scaler = None
        self.features = []
        self._load()

    def _load(self):
        try:
            data = pickle.load(open(MODEL_FILE, 'rb'))
            self.model    = data['model']
            self.scaler   = data['scaler']
            self.features = data['features']
            self.loaded   = True
            log.info("ML model loaded ✅")
        except Exception as e:
            log.warning(f"ML model not loaded: {e}")

    def predict(self, ind: dict) -> float:
        if not self.loaded:
            return 0.5
        try:
            row = [
                ind.get('rsi', 50),
                ind.get('ema_diff', 0),
                ind.get('vol_ratio', 1),
                ind.get('bb_pct', 0.5),
                ind.get('volatility', 0.02),
                ind.get('macd_hist', 0),
                ind.get('momentum', 0),
                ind.get('high_low_pct', 0.01),
            ]
            X = self.scaler.transform([row])
            return float(self.model.predict_proba(X)[0][1])
        except Exception as e:
            log.warning(f"ML predict error: {e}")
            return 0.5


# ══════════════════════════════════════════════════════════════════════════════
# SENTIMENT
# ══════════════════════════════════════════════════════════════════════════════

class SentimentSignal:
    def __init__(self):
        self.cache = {}
        self.cache_ttl = 600

    def get(self, symbol: str) -> float:
        base = symbol.replace('USD','').replace('USDT','')
        now  = time.time()
        if base in self.cache and now - self.cache[base]['ts'] < self.cache_ttl:
            return self.cache[base]['val']
        signal = 0.0
        try:
            repo_map = {'BTC':'bitcoin/bitcoin','XRP':'ripple/rippled','ETH':'ethereum/go-ethereum'}
            repo = repo_map.get(base)
            if repo:
                r = requests.get(
                    f"https://api.github.com/repos/{repo}/commits",
                    params={'per_page': 30}, timeout=5)
                if r.status_code == 200:
                    commits = len(r.json())
                    signal = (min(commits, 30) / 30 - 0.5) * 0.4
        except Exception as e:
            log.debug(f"Sentiment error: {e}")
        self.cache[base] = {'val': signal, 'ts': now}
        return signal


# ══════════════════════════════════════════════════════════════════════════════
# VOLATILITY
# ══════════════════════════════════════════════════════════════════════════════

class VolatilitySignal:
    def get(self, ind: dict) -> float:
        vol  = ind.get('volatility', 0.02)
        bb_w = ind.get('bb_width', 0.02)
        score = (min(vol, 0.08) / 0.08) * 0.6 + (min(bb_w, 0.05) / 0.05) * 0.4
        return float(np.clip(score, 0, 1))


# ══════════════════════════════════════════════════════════════════════════════
# TELEGRAM
# ══════════════════════════════════════════════════════════════════════════════

def telegram(message: str, silent: bool = False):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": message,
                  "parse_mode": "HTML", "disable_notification": silent},
            timeout=10
        )
    except Exception as e:
        log.error(f"Telegram: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# KRAKEN
# ══════════════════════════════════════════════════════════════════════════════

def kraken_public(endpoint, params={}):
    try:
        r = requests.get(f"{KRAKEN_BASE}/0/public/{endpoint}", params=params, timeout=10)
        return r.json()
    except Exception as e:
        log.error(f"Kraken public: {e}")
        return {'error': [str(e)], 'result': {}}

def kraken_private(endpoint, data={}):
    try:
        nonce = str(int(time.time() * 1000))
        data['nonce'] = nonce
        path = f"/0/private/{endpoint}"
        post_data = urllib.parse.urlencode(data)
        encoded = (nonce + post_data).encode()
        message = path.encode() + hashlib.sha256(encoded).digest()
        secret  = base64.b64decode(KRAKEN_API_SECRET)
        sig = base64.b64encode(hmac.new(secret, message, hashlib.sha512).digest()).decode()
        r = requests.post(f"{KRAKEN_BASE}{path}", data=data,
                          headers={'API-Key': KRAKEN_API_KEY, 'API-Sign': sig}, timeout=10)
        return r.json()
    except Exception as e:
        log.error(f"Kraken private: {e}")
        return {'error': [str(e)], 'result': {}}

def get_ohlc(pair='XRPUSD', interval=5, count=100):
    data = kraken_public('OHLC', {'pair': pair, 'interval': interval})
    if data.get('error'):
        return pd.DataFrame()
    key = [k for k in data.get('result', {}) if k != 'last']
    if not key:
        return pd.DataFrame()
    rows = data['result'][key[0]][-count:]
    df = pd.DataFrame(rows, columns=['time','open','high','low','close','vwap','volume','count'])
    for col in ['open','high','low','close','vwap','volume']:
        df[col] = pd.to_numeric(df[col])
    df['time'] = pd.to_datetime(df['time'], unit='s')
    return df

def get_ticker(pair='XRPUSD'):
    data = kraken_public('Ticker', {'pair': pair})
    if not data.get('result'):
        return None
    k = list(data['result'].keys())[0]
    t = data['result'][k]
    return {
        'pair':   pair,
        'price':  float(t['c'][0]),
        'bid':    float(t['b'][0]),
        'ask':    float(t['a'][0]),
        'volume': float(t['v'][1]),
        'high':   float(t['h'][1]),
        'low':    float(t['l'][1]),
    }


# ══════════════════════════════════════════════════════════════════════════════
# INDICATORS
# ══════════════════════════════════════════════════════════════════════════════

def compute_indicators(df: pd.DataFrame) -> dict:
    c = df['close']
    v = df['volume']

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

    mid   = c.rolling(20).mean()
    std   = c.rolling(20).std()
    upper = mid + 2 * std
    lower = mid - 2 * std
    price    = float(c.iloc[-1])
    bb_width = float((upper - lower).iloc[-1])
    bb_pct   = float((price - lower.iloc[-1]) / (bb_width if bb_width > 0 else 1))

    vol_ratio  = float(v.iloc[-1] / v.tail(20).mean()) if v.tail(20).mean() > 0 else 1.0
    volatility = float(c.pct_change().tail(14).std() * np.sqrt(14))
    momentum   = float((c.iloc[-1] / c.iloc[-6] - 1) if len(c) > 5 else 0)
    high_low_pct = float((df['high'].iloc[-1] - df['low'].iloc[-1]) / price)

    return {
        'price':        price,
        'rsi':          rsi,
        'macd_hist':    macd_hist,
        'macd':         float(macd_line.iloc[-1]),
        'macd_signal':  float(signal_line.iloc[-1]),
        'bb_pct':       bb_pct,
        'bb_width':     bb_width,
        'ema9':         float(ema9.iloc[-1]),
        'ema21':        float(ema21.iloc[-1]),
        'ema_diff':     float((ema9.iloc[-1] - ema21.iloc[-1]) / price),
        'vol_ratio':    vol_ratio,
        'volatility':   volatility,
        'momentum':     momentum,
        'high_low_pct': high_low_pct,
        'volume':       float(v.iloc[-1]),
        'avg_volume':   float(v.tail(20).mean()),
    }


# ══════════════════════════════════════════════════════════════════════════════
# SIGNAL ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def generate_signal(ind: dict, ticker: dict, ml: MLSignal,
                    sentiment: SentimentSignal, vol_signal: VolatilitySignal) -> dict:
    bullish = 0
    bearish = 0
    reasons = []
    total   = 8
    rsi     = ind['rsi']
    macd_h  = ind['macd_hist']
    bb_pct  = ind['bb_pct']
    price   = ind['price']
    pair    = ticker['pair']

    if rsi < RSI_OVERSOLD:
        bullish += 1; reasons.append(f"RSI oversold {rsi:.1f}")
    elif rsi > RSI_OVERBOUGHT:
        bearish += 1; reasons.append(f"RSI overbought {rsi:.1f}")

    if macd_h > 0 and ind['macd'] > ind['macd_signal']:
        bullish += 1; reasons.append(f"MACD bullish ({macd_h:+.5f})")
    elif macd_h < 0 and ind['macd'] < ind['macd_signal']:
        bearish += 1; reasons.append(f"MACD bearish ({macd_h:+.5f})")

    if bb_pct < 0.2:
        bullish += 1; reasons.append(f"Near lower BB ({bb_pct:.2f})")
    elif bb_pct > 0.8:
        bearish += 1; reasons.append(f"Near upper BB ({bb_pct:.2f})")

    if ind['ema9'] > ind['ema21']:
        bullish += 1; reasons.append("EMA uptrend")
    else:
        bearish += 1; reasons.append("EMA downtrend")

    if ind['momentum'] > 0.003:
        bullish += 1; reasons.append(f"Positive momentum {ind['momentum']*100:.2f}%")
    elif ind['momentum'] < -0.003:
        bearish += 1; reasons.append(f"Negative momentum {ind['momentum']*100:.2f}%")

    if ind['vol_ratio'] > 1.2:
        if bullish > bearish:
            bullish += 1; reasons.append(f"Volume spike bullish ({ind['vol_ratio']:.1f}x)")
        else:
            bearish += 1; reasons.append(f"Volume spike bearish ({ind['vol_ratio']:.1f}x)")

    sent = sentiment.get(pair)
    if sent > 0.05:
        bullish += 1; reasons.append(f"Positive sentiment {sent:+.2f}")
    elif sent < -0.05:
        bearish += 1; reasons.append(f"Negative sentiment {sent:+.2f}")

    vol_score = vol_signal.get(ind)
    if vol_score > 0.75:
        reasons.append(f"⚠ High volatility ({vol_score:.2f})")
        bullish = max(0, bullish - 1)
        bearish = max(0, bearish - 1)

    net       = bullish - bearish
    tech_conf = abs(net) / total
    ml_prob   = ml.predict(ind)
    ml_bullish = ml_prob > 0.55
    ml_bearish = ml_prob < 0.45
    reasons.append(f"ML: {ml_prob*100:.0f}% bullish")

    combined_conf = tech_conf * (1 - ML_WEIGHT) + (abs(ml_prob - 0.5) * 2) * ML_WEIGHT

    if net >= NET_SCORE_NEEDED and combined_conf >= MIN_SIGNAL_CONF:
        if ml_bearish and net < 3:
            action = 'HOLD'; reasons.append("ML overrides weak bullish")
        else:
            action = 'BUY'
    elif net <= -NET_SCORE_NEEDED and combined_conf >= MIN_SIGNAL_CONF:
        if ml_bullish and net > -3:
            action = 'HOLD'; reasons.append("ML overrides weak bearish")
        else:
            action = 'SELL'
    else:
        action = 'HOLD'

    return {
        'action':     action,
        'confidence': round(combined_conf, 3),
        'tech_conf':  round(tech_conf, 3),
        'ml_prob':    round(ml_prob, 3),
        'sentiment':  round(sent, 3),
        'vol_score':  round(vol_score, 3),
        'bullish':    bullish,
        'bearish':    bearish,
        'reasons':    reasons,
        'pair':       pair,
        'price':      price,
        'rsi_val':    rsi,
        'timestamp':  datetime.now().isoformat(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# RISK GUARD
# ══════════════════════════════════════════════════════════════════════════════

class RiskGuard:
    def __init__(self, balance):
        self.start      = balance
        self.day_start  = balance
        self.peak       = balance
        self.halted     = False
        self.halt_reason = ''

    def check(self, balance):
        if self.halted: return False
        self.peak = max(self.peak, balance)
        dd = (self.peak - balance) / self.peak
        if dd >= MAX_DRAWDOWN:
            self.halted = True
            self.halt_reason = f"Max drawdown {dd*100:.1f}%"
            telegram(f"🛑 <b>EMERGENCY STOP</b>\n{self.halt_reason}")
            return False
        daily = (self.day_start - balance) / self.day_start
        if daily >= MAX_DAILY_LOSS:
            self.halted = True
            self.halt_reason = f"Daily loss {daily*100:.1f}%"
            telegram(f"🛑 <b>Daily Loss Limit</b>\n{self.halt_reason}")
            return False
        return True

    def size(self, balance, confidence, vol_score):
        base = balance * RISK_PER_TRADE
        vol_adj = 1 - (vol_score * 0.5)
        return round(base * confidence * vol_adj, 2)

    def new_day(self, balance):
        self.day_start = balance
        if 'Daily' in self.halt_reason:
            self.halted = False; self.halt_reason = ''


# ══════════════════════════════════════════════════════════════════════════════
# PAPER TRADER
# ══════════════════════════════════════════════════════════════════════════════

class PaperTrader:
    def __init__(self, balance):
        self.balance   = balance
        self.positions = {}
        self.trade_log = []
        self.wins      = 0
        self.losses    = 0

    def check_exits(self, tickers: dict) -> list:
        closed = []
        for pair, pos in list(self.positions.items()):
            if pair not in tickers or tickers[pair] is None:
                continue
            price  = tickers[pair]['price']
            entry  = pos['entry']
            change = (price - entry) / entry

            exit_reason = None
            if change >= TAKE_PROFIT_PCT:
                exit_reason = f"TP +{change*100:.2f}%"
            elif change <= -STOP_LOSS_PCT:
                exit_reason = f"SL {change*100:.2f}%"

            if exit_reason:
                value = pos['size'] * price
                pnl   = value - pos['cost']
                self.balance += value
                if pnl >= 0: self.wins += 1
                else:         self.losses += 1
                del self.positions[pair]

                trade = {
                    'id': len(self.trade_log) + 1, 'pair': pair, 'action': 'SELL',
                    'price': price, 'size_usd': round(value, 2),
                    'units': round(pos['size'], 4),
                    'confidence': 0.0, 'ml_prob': 0.0, 'sentiment': 0.0,
                    'time': datetime.now().isoformat(),
                    'pnl': round(pnl, 4),
                    'pnl_pct': round(pnl / pos['cost'] * 100, 2),
                    'status': 'CLOSED',
                    'reasons': [exit_reason, f"Entry: ${entry:.4f}", f"Exit: ${price:.4f}"]
                }
                self.trade_log.append(trade)
                closed.append((trade, exit_reason))
                log.info(f"  💰 AUTO-EXIT {pair} — {exit_reason} | P&L: ${pnl:+.4f}")
        return closed

    def execute(self, signal, ticker, size_usd):
        pair   = ticker['pair']
        price  = ticker['price']
        action = signal['action']

        if action == 'BUY' and pair not in self.positions:
            size_usd = min(size_usd, self.balance * 0.95)
            if size_usd < 1.0:
                return None
            units = size_usd / price
            self.positions[pair] = {
                'size': units, 'entry': price, 'cost': size_usd,
                'open_time': datetime.now().isoformat()
            }
            self.balance -= size_usd
            trade = {
                'id': len(self.trade_log) + 1, 'pair': pair, 'action': 'BUY',
                'price': price, 'size_usd': round(size_usd, 2), 'units': round(units, 4),
                'confidence': signal['confidence'], 'ml_prob': signal['ml_prob'],
                'sentiment': signal['sentiment'], 'time': datetime.now().isoformat(),
                'pnl': None, 'status': 'OPEN', 'reasons': signal['reasons'][:4]
            }
            self.trade_log.append(trade)
            return trade

        elif action == 'SELL' and pair in self.positions:
            pos   = self.positions.pop(pair)
            value = pos['size'] * price
            pnl   = value - pos['cost']
            self.balance += value
            if pnl >= 0: self.wins += 1
            else:         self.losses += 1
            trade = {
                'id': len(self.trade_log) + 1, 'pair': pair, 'action': 'SELL',
                'price': price, 'size_usd': round(value, 2), 'units': round(pos['size'], 4),
                'confidence': signal['confidence'], 'ml_prob': signal['ml_prob'],
                'sentiment': signal['sentiment'], 'time': datetime.now().isoformat(),
                'pnl': round(pnl, 4), 'pnl_pct': round(pnl / pos['cost'] * 100, 2),
                'status': 'CLOSED', 'reasons': signal['reasons'][:4]
            }
            self.trade_log.append(trade)
            return trade
        return None

    @property
    def total_pnl(self): return self.balance - PAPER_BALANCE
    @property
    def win_rate(self):
        t = self.wins + self.losses
        return (self.wins / t * 100) if t > 0 else 0
    def summary(self):
        return (f"Balance: ${self.balance:.2f} | P&L: ${self.total_pnl:+.2f} | "
                f"Trades: {self.wins+self.losses} | Win: {self.win_rate:.1f}%")


# ══════════════════════════════════════════════════════════════════════════════
# TELEGRAM FORMATTERS
# ══════════════════════════════════════════════════════════════════════════════

def fmt_trade(trade, reasons=None):
    emoji = "🟢" if trade['action'] == 'BUY' else "🔴"
    pnl   = f"\n💰 P&L: <b>${trade['pnl']:+.4f} ({trade.get('pnl_pct',0):+.2f}%)</b>" if trade['pnl'] is not None else ""
    r_list = reasons or trade.get('reasons', [])
    steps  = "\n".join(f"  • {r}" for r in r_list[:4])
    return (
        f"{emoji} <b>{trade['action']} {trade['pair']}</b>\n"
        f"Price: ${trade['price']:.4f} | Size: ${trade['size_usd']:.2f}{pnl}\n"
        f"<b>Reason:</b>\n{steps}"
    )

def fmt_hourly(trader, signals):
    sig_lines = ""
    for pair, sig in signals.items():
        sig_lines += f"\n{pair}: {sig.get('action','—')} | RSI {sig.get('rsi_val',0):.0f} | ML {sig.get('ml_prob',0.5)*100:.0f}%"
    return (
        f"📊 <b>Hourly Update</b>\n"
        f"Balance:  ${trader.balance:.2f}\n"
        f"P&L:      ${trader.total_pnl:+.2f}\n"
        f"Win Rate: {trader.win_rate:.1f}%\n"
        f"Trades:   {trader.wins + trader.losses}\n"
        f"{sig_lines}"
    )


# ══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ══════════════════════════════════════════════════════════════════════════════

def main():
    log.info("=" * 60)
    log.info("  NaliBot v3 — 60s loops + Auto TP/SL + Aggressive signals")
    log.info("=" * 60)

    ml        = MLSignal()
    sentiment = SentimentSignal()
    vol_sig   = VolatilitySignal()
    trader    = PaperTrader(PAPER_BALANCE)
    guard     = RiskGuard(PAPER_BALANCE)

    last_hourly  = datetime.now()
    last_day     = datetime.now().date()
    loop         = 0
    last_signals = {}
    last_prices  = {}

    telegram(
        f"🚀 <b>NaliBot v3 Started</b>\n"
        f"Mode: 60s loops | TP +{TAKE_PROFIT_PCT*100:.0f}% | SL -{STOP_LOSS_PCT*100:.0f}%\n"
        f"ML: {'✅' if ml.loaded else '⚠'} | Min conf: {MIN_SIGNAL_CONF:.0%}\n"
        f"Pairs: {', '.join(TRADING_PAIRS)}\n"
        f"Balance: ${PAPER_BALANCE:,.2f}"
    )

    while True:
        try:
            loop += 1
            log.info(f"\n{'─'*50}")
            log.info(f"Loop #{loop} | {datetime.now().strftime('%H:%M:%S')}")

            today = datetime.now().date()
            if today != last_day:
                guard.new_day(trader.balance)
                last_day = today
                telegram(f"🌅 <b>New Day</b>\n{trader.summary()}")

            if not guard.check(trader.balance):
                save_state(trader, last_signals, last_prices)
                time.sleep(LOOP_INTERVAL_SEC)
                continue

            tickers = {}
            for pair in TRADING_PAIRS:
                t = get_ticker(pair)
                if t:
                    tickers[pair] = t

            if trader.positions:
                exits = trader.check_exits(tickers)
                for trade, reason in exits:
                    telegram(fmt_trade(trade))
                if exits:
                    save_state(trader, last_signals, last_prices)

            for pair in TRADING_PAIRS:
                log.info(f"▶ {pair}")
                df = get_ohlc(pair, interval=5, count=100)
                if df.empty:
                    continue

                ticker = tickers.get(pair)
                if not ticker:
                    continue

                ind    = compute_indicators(df)
                signal = generate_signal(ind, ticker, ml, sentiment, vol_sig)

                last_prices[pair]  = {'price': ind['price'], 'rsi': ind['rsi'],
                                       'time': datetime.now().isoformat()}
                last_signals[pair] = signal

                log.info(
                    f"  ${ind['price']:.4f} | RSI:{ind['rsi']:.1f} | "
                    f"MACD:{ind['macd_hist']:+.5f} | BB:{ind['bb_pct']:.2f} | "
                    f"ML:{signal['ml_prob']*100:.0f}% | Sent:{signal['sentiment']:+.2f}"
                )
                log.info(
                    f"  → {signal['action']} | Conf:{signal['confidence']*100:.0f}% "
                    f"[bull:{signal['bullish']} bear:{signal['bearish']}]"
                )

                if signal['action'] != 'HOLD':
                    size  = guard.size(trader.balance, signal['confidence'], signal['vol_score'])
                    trade = trader.execute(signal, ticker, size)
                    if trade:
                        status = "OPENED" if trade['pnl'] is None else f"CLOSED P&L:${trade['pnl']:+.4f}"
                        log.info(f"  ✅ {status} ${trade['size_usd']:.2f}")
                        telegram(fmt_trade(trade, signal['reasons']))
                    else:
                        log.info(f"  ⏭ No trade (position already open or no capital)")

                time.sleep(0.5)

            save_state(trader, last_signals, last_prices)
            log.info(f"Portfolio: {trader.summary()}")

            if (datetime.now() - last_hourly).seconds >= 3600:
                last_hourly = datetime.now()
                telegram(fmt_hourly(trader, last_signals), silent=True)

            log.info(f"Sleeping {LOOP_INTERVAL_SEC}s...")
            time.sleep(LOOP_INTERVAL_SEC)

        except KeyboardInterrupt:
            log.info("Bot stopped by user.")
            telegram(f"🛑 <b>NaliBot Stopped</b>\n{trader.summary()}")
            break
        except Exception as e:
            log.error(f"Loop error: {e}", exc_info=True)
            telegram(f"⚠️ <b>Error</b>\n{str(e)}", silent=True)
            time.sleep(30)


if __name__ == '__main__':
    main()
