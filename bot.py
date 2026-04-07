"""
NaliBot — Main Orchestrator Loop v4
New in v4:
  1. Trailing Stop Loss  — follows price up, only exits on reversal
                           (replaces hard -1% stop from entry)
  2. BTC Correlation Filter — blocks BUY signals when BTC is dropping >1.5%/hr
  3. CryptoPanic Sentiment  — real news sentiment for XRP/BTC/ETH
     + Fear & Greed Index   — macro crypto mood (daily)
"""

import os, time, json, hmac, hashlib, base64, urllib.parse
import logging, requests, pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv

# ── Env ───────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'ai-trading-bot', '.env.local'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'config', 'production.env'))

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
log = logging.getLogger('NaliBot')

# ── Config ────────────────────────────────────────────────────────────────────
KRAKEN_API_KEY    = os.getenv('KRAKEN_API_KEY', '')
KRAKEN_API_SECRET = os.getenv('KRAKEN_API_SECRET', '')
TELEGRAM_TOKEN    = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID  = os.getenv('TELEGRAM_CHAT_ID', '')
CRYPTOPANIC_KEY   = os.getenv('CRYPTOPANIC_API_KEY', '')   # optional — works without it (free tier)
KRAKEN_BASE       = 'https://api.kraken.com'
STATE_FILE        = os.path.join(os.path.dirname(__file__), 'state.json')
MODEL_FILE        = os.path.join(os.path.dirname(__file__), 'models', 'signal_model.pkl')

TRADING_PAIRS     = ['XRPUSD', 'XRPUSDT']
LOOP_INTERVAL_SEC = 60
PAPER_BALANCE     = 1000.0

# ── Signal thresholds ─────────────────────────────────────────────────────────
MIN_SIGNAL_CONF   = 0.25
RSI_OVERSOLD      = 42
RSI_OVERBOUGHT    = 58
NET_SCORE_NEEDED  = 1
RISK_PER_TRADE    = 0.08
MAX_DAILY_LOSS    = 0.15
MAX_DRAWDOWN      = 0.20
ML_WEIGHT         = 0.30

# ── Exit rules ────────────────────────────────────────────────────────────────
TAKE_PROFIT_PCT   = 0.025   # scale-out: close 100% at +2.5% (or use ladder below)
TRAIL_PCT         = 0.012   # trailing stop: 1.2% below rolling peak
HARD_FLOOR_PCT    = 0.025   # absolute floor: never lose more than 2.5% from entry

# ── BTC filter ────────────────────────────────────────────────────────────────
BTC_DROP_BLOCK    = -0.015  # block BUY if BTC dropped >1.5% in last hour
BTC_CRASH_BLOCK   = -0.035  # block ALL trades if BTC dropped >3.5% in last hour

# ── Fear & Greed ──────────────────────────────────────────────────────────────
FEAR_EXTREME      = 20      # F&G below this → reduce size to 50%
GREED_EXTREME     = 80      # F&G above this → reduce size to 75%


# ══════════════════════════════════════════════════════════════════════════════
# STATE → dashboard
# ══════════════════════════════════════════════════════════════════════════════

def save_state(trader, signals: dict, last_prices: dict, btc_filter: dict, fg_score: int):
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
        "signals":   signals,
        "prices":    last_prices,
        "trades":    trader.trade_log[-50:],
        "btcFilter": btc_filter,
        "fearGreed": fg_score,
    }
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


# ══════════════════════════════════════════════════════════════════════════════
# ML MODEL
# ══════════════════════════════════════════════════════════════════════════════

class MLSignal:
    def __init__(self):
        self.loaded   = False
        self.model    = None
        self.scaler   = None
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
                ind.get('rsi', 50), ind.get('ema_diff', 0),
                ind.get('vol_ratio', 1), ind.get('bb_pct', 0.5),
                ind.get('volatility', 0.02), ind.get('macd_hist', 0),
                ind.get('momentum', 0), ind.get('high_low_pct', 0.01),
            ]
            X = self.scaler.transform([row])
            return float(self.model.predict_proba(X)[0][1])
        except Exception as e:
            log.warning(f"ML predict error: {e}")
            return 0.5


# ══════════════════════════════════════════════════════════════════════════════
# ① CRYPTOPANIC + FEAR & GREED SENTIMENT  (replaces GitHub proxy)
# ══════════════════════════════════════════════════════════════════════════════

class SentimentSignal:
    """
    Two data sources:
      A) CryptoPanic — real news headlines with bullish/bearish vote counts
      B) Alternative.me Fear & Greed Index — macro crypto mood 0–100
    """
    def __init__(self):
        self._news_cache  = {}   # symbol → {val, ts}
        self._fg_cache    = {'val': 50, 'ts': 0}
        self._news_ttl    = 600   # 10 min
        self._fg_ttl      = 3600  # 1 hour

    # ── A: CryptoPanic ────────────────────────────────────────────────────────
    def _fetch_news(self, symbol: str) -> float:
        """
        Returns -0.5 (very bearish) to +0.5 (very bullish).
        Uses bullish_count vs bearish_count from CryptoPanic API.
        Works without an API key (public endpoint, lower rate limit).
        """
        base = symbol.replace('USD', '').replace('USDT', '').upper()
        try:
            params = {
                'auth_token': CRYPTOPANIC_KEY if CRYPTOPANIC_KEY else 'public',
                'currencies': base,
                'filter':     'hot',
                'public':     'true',
            }
            r = requests.get(
                'https://cryptopanic.com/api/v1/posts/',
                params=params, timeout=8
            )
            if r.status_code != 200:
                return 0.0

            posts = r.json().get('results', [])
            if not posts:
                return 0.0

            bullish = sum(p.get('votes', {}).get('positive', 0) for p in posts[:20])
            bearish = sum(p.get('votes', {}).get('negative', 0) for p in posts[:20])
            total   = bullish + bearish
            if total == 0:
                return 0.0

            # Normalize to -0.5 → +0.5
            score = ((bullish - bearish) / total) * 0.5
            log.info(f"  CryptoPanic {base}: bull={bullish} bear={bearish} → {score:+.3f}")
            return float(np.clip(score, -0.5, 0.5))

        except Exception as e:
            log.debug(f"CryptoPanic error: {e}")
            return 0.0

    # ── B: Fear & Greed Index ─────────────────────────────────────────────────
    def fear_greed(self) -> int:
        """Returns 0 (extreme fear) to 100 (extreme greed)."""
        now = time.time()
        if now - self._fg_cache['ts'] < self._fg_ttl:
            return self._fg_cache['val']
        try:
            r = requests.get('https://api.alternative.me/fng/?limit=1', timeout=6)
            val = int(r.json()['data'][0]['value'])
            self._fg_cache = {'val': val, 'ts': now}
            log.info(f"  Fear & Greed: {val}/100")
            return val
        except Exception as e:
            log.debug(f"Fear & Greed error: {e}")
            return self._fg_cache['val']

    # ── Combined getter ───────────────────────────────────────────────────────
    def get(self, symbol: str) -> float:
        """Returns final sentiment score -0.5 → +0.5."""
        now = time.time()
        if symbol in self._news_cache and now - self._news_cache[symbol]['ts'] < self._news_ttl:
            news_score = self._news_cache[symbol]['val']
        else:
            news_score = self._fetch_news(symbol)
            self._news_cache[symbol] = {'val': news_score, 'ts': now}

        # Blend: 70% news, 30% Fear & Greed normalized
        fg    = self.fear_greed()
        fg_norm = (fg - 50) / 100   # -0.5 → +0.5
        blended = news_score * 0.7 + fg_norm * 0.3
        return float(np.clip(blended, -0.5, 0.5))


# ══════════════════════════════════════════════════════════════════════════════
# ② BTC CORRELATION FILTER
# ══════════════════════════════════════════════════════════════════════════════

class BTCFilter:
    """
    Fetches BTC/USD price and computes 1-hour momentum.
    Returns block level:
      0 = clear to trade
      1 = soft block  → block BUY signals
      2 = hard block  → block ALL trades
    """
    def __init__(self):
        self._cache = {}   # 'btc_price' → deque of (ts, price)
        self._prices: list = []   # rolling 1h window of (ts, price)
        self._last_fetch = 0

    def update(self) -> dict:
        """Fetch current BTC price and update rolling window."""
        now = time.time()
        if now - self._last_fetch < 55:   # don't over-fetch
            return self._status()

        try:
            r = requests.get(
                f'{KRAKEN_BASE}/0/public/Ticker',
                params={'pair': 'XBTUSD'}, timeout=8
            )
            data = r.json()
            if not data.get('result'):
                return self._status()

            key   = list(data['result'].keys())[0]
            price = float(data['result'][key]['c'][0])
            self._prices.append((now, price))
            # Keep only last 65 minutes of data
            cutoff = now - 3900
            self._prices = [(t, p) for t, p in self._prices if t > cutoff]
            self._last_fetch = now
            log.info(f"  BTC: ${price:,.2f}")
        except Exception as e:
            log.debug(f"BTC fetch error: {e}")

        return self._status()

    def _status(self) -> dict:
        """Compute 1h momentum and return block level + details."""
        if len(self._prices) < 2:
            return {'block': 0, 'momentum_1h': 0.0, 'btc_price': 0.0, 'reason': 'insufficient data'}

        now     = time.time()
        current = self._prices[-1][1]

        # Find price ~60 minutes ago
        target_ts = now - 3600
        hour_ago_prices = [(t, p) for t, p in self._prices if abs(t - target_ts) < 300]
        if not hour_ago_prices:
            hour_ago_price = self._prices[0][1]
        else:
            hour_ago_price = min(hour_ago_prices, key=lambda x: abs(x[0] - target_ts))[1]

        momentum_1h = (current - hour_ago_price) / hour_ago_price

        block  = 0
        reason = f"BTC 1h: {momentum_1h*100:+.2f}%"

        if momentum_1h <= BTC_CRASH_BLOCK:
            block  = 2
            reason = f"🚨 BTC CRASH {momentum_1h*100:+.2f}% — all trades blocked"
        elif momentum_1h <= BTC_DROP_BLOCK:
            block  = 1
            reason = f"⚠ BTC weak {momentum_1h*100:+.2f}% — BUY signals blocked"

        return {
            'block':       block,
            'momentum_1h': round(momentum_1h, 4),
            'btc_price':   round(current, 2),
            'reason':      reason,
        }


# ══════════════════════════════════════════════════════════════════════════════
# VOLATILITY SIGNAL
# ══════════════════════════════════════════════════════════════════════════════

class VolatilitySignal:
    def get(self, ind: dict) -> float:
        vol   = ind.get('volatility', 0.02)
        bb_w  = ind.get('bb_width', 0.02)
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
# KRAKEN API
# ══════════════════════════════════════════════════════════════════════════════

def kraken_public(endpoint, params={}):
    try:
        r = requests.get(f"{KRAKEN_BASE}/0/public/{endpoint}", params=params, timeout=10)
        return r.json()
    except Exception as e:
        log.error(f"Kraken public: {e}")
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

    mid      = c.rolling(20).mean()
    std      = c.rolling(20).std()
    upper    = mid + 2 * std
    lower    = mid - 2 * std
    price    = float(c.iloc[-1])
    bb_width = float((upper - lower).iloc[-1])
    bb_pct   = float((price - lower.iloc[-1]) / (bb_width if bb_width > 0 else 1))

    vol_ratio  = float(v.iloc[-1] / v.tail(20).mean()) if v.tail(20).mean() > 0 else 1.0
    volatility = float(c.pct_change().tail(14).std() * np.sqrt(14))
    momentum   = float((c.iloc[-1] / c.iloc[-6] - 1) if len(c) > 5 else 0)
    hl_pct     = float((df['high'].iloc[-1] - df['low'].iloc[-1]) / price)

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
        'high_low_pct': hl_pct,
        'volume':       float(v.iloc[-1]),
        'avg_volume':   float(v.tail(20).mean()),
    }


# ══════════════════════════════════════════════════════════════════════════════
# SIGNAL ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def generate_signal(ind: dict, ticker: dict, ml: MLSignal,
                    sentiment: SentimentSignal, vol_signal: VolatilitySignal,
                    btc_status: dict, fg_score: int) -> dict:

    bullish = 0
    bearish = 0
    reasons = []
    total   = 9   # +1 for BTC/sentiment combined check
    pair    = ticker['pair']
    price   = ind['price']
    rsi     = ind['rsi']
    macd_h  = ind['macd_hist']
    bb_pct  = ind['bb_pct']

    # ── 1. RSI ────────────────────────────────────────────────────────────────
    if rsi < RSI_OVERSOLD:
        bullish += 1; reasons.append(f"RSI oversold {rsi:.1f}")
    elif rsi > RSI_OVERBOUGHT:
        bearish += 1; reasons.append(f"RSI overbought {rsi:.1f}")

    # ── 2. MACD ───────────────────────────────────────────────────────────────
    if macd_h > 0 and ind['macd'] > ind['macd_signal']:
        bullish += 1; reasons.append(f"MACD bullish ({macd_h:+.5f})")
    elif macd_h < 0 and ind['macd'] < ind['macd_signal']:
        bearish += 1; reasons.append(f"MACD bearish ({macd_h:+.5f})")

    # ── 3. Bollinger ──────────────────────────────────────────────────────────
    if bb_pct < 0.2:
        bullish += 1; reasons.append(f"Near lower BB ({bb_pct:.2f})")
    elif bb_pct > 0.8:
        bearish += 1; reasons.append(f"Near upper BB ({bb_pct:.2f})")

    # ── 4. EMA trend ──────────────────────────────────────────────────────────
    if ind['ema9'] > ind['ema21']:
        bullish += 1; reasons.append("EMA uptrend")
    else:
        bearish += 1; reasons.append("EMA downtrend")

    # ── 5. Momentum ───────────────────────────────────────────────────────────
    if ind['momentum'] > 0.003:
        bullish += 1; reasons.append(f"Positive momentum {ind['momentum']*100:.2f}%")
    elif ind['momentum'] < -0.003:
        bearish += 1; reasons.append(f"Negative momentum {ind['momentum']*100:.2f}%")

    # ── 6. Volume confirmation ────────────────────────────────────────────────
    if ind['vol_ratio'] > 1.2:
        if bullish > bearish:
            bullish += 1; reasons.append(f"Volume spike bullish ({ind['vol_ratio']:.1f}x)")
        else:
            bearish += 1; reasons.append(f"Volume spike bearish ({ind['vol_ratio']:.1f}x)")

    # ── 7. CryptoPanic + F&G Sentiment ───────────────────────────────────────
    sent = sentiment.get(pair)
    if sent > 0.05:
        bullish += 1; reasons.append(f"News bullish {sent:+.2f} | F&G {fg_score}")
    elif sent < -0.05:
        bearish += 1; reasons.append(f"News bearish {sent:+.2f} | F&G {fg_score}")
    else:
        reasons.append(f"News neutral {sent:+.2f} | F&G {fg_score}")

    # ── 8. BTC Correlation check (as signal vote) ─────────────────────────────
    btc_mom = btc_status.get('momentum_1h', 0)
    if btc_mom > 0.010:
        bullish += 1; reasons.append(f"BTC tailwind {btc_mom*100:+.2f}%/1h")
    elif btc_mom < -0.010:
        bearish += 1; reasons.append(f"BTC headwind {btc_mom*100:+.2f}%/1h")

    # ── 9. Volatility guard ───────────────────────────────────────────────────
    vol_score = vol_signal.get(ind)
    if vol_score > 0.75:
        reasons.append(f"⚠ High vol ({vol_score:.2f}) — size reduced")
        bullish = max(0, bullish - 1)
        bearish = max(0, bearish - 1)

    # ── ML vote ───────────────────────────────────────────────────────────────
    ml_prob    = ml.predict(ind)
    ml_bullish = ml_prob > 0.55
    ml_bearish = ml_prob < 0.45
    reasons.append(f"ML: {ml_prob*100:.0f}% bullish")

    net           = bullish - bearish
    tech_conf     = abs(net) / total
    combined_conf = tech_conf * (1 - ML_WEIGHT) + (abs(ml_prob - 0.5) * 2) * ML_WEIGHT

    # ── ② BTC FILTER applied here ─────────────────────────────────────────────
    btc_block = btc_status.get('block', 0)
    action    = 'HOLD'

    if btc_block == 2:
        # Hard block — no trades at all
        reasons.append(f"🚨 {btc_status['reason']}")
        action = 'HOLD'
    elif net >= NET_SCORE_NEEDED and combined_conf >= MIN_SIGNAL_CONF:
        if btc_block == 1:
            # Soft block — BUY signals blocked
            reasons.append(f"⚠ BUY blocked: {btc_status['reason']}")
            action = 'HOLD'
        elif ml_bearish and net < 3:
            reasons.append("ML overrides weak bullish")
            action = 'HOLD'
        else:
            action = 'BUY'
    elif net <= -NET_SCORE_NEEDED and combined_conf >= MIN_SIGNAL_CONF:
        if ml_bullish and net > -3:
            reasons.append("ML overrides weak bearish")
            action = 'HOLD'
        else:
            action = 'SELL'

    return {
        'action':     action,
        'confidence': round(combined_conf, 3),
        'tech_conf':  round(tech_conf, 3),
        'ml_prob':    round(ml_prob, 3),
        'sentiment':  round(sent, 3),
        'fg_score':   fg_score,
        'vol_score':  round(vol_score, 3),
        'btc_block':  btc_block,
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
        self.start       = balance
        self.day_start   = balance
        self.peak        = balance
        self.halted      = False
        self.halt_reason = ''

    def check(self, balance):
        if self.halted: return False
        self.peak = max(self.peak, balance)
        dd = (self.peak - balance) / self.peak
        if dd >= MAX_DRAWDOWN:
            self.halted = True; self.halt_reason = f"Max drawdown {dd*100:.1f}%"
            telegram(f"🛑 <b>EMERGENCY STOP</b>\n{self.halt_reason}")
            return False
        daily = (self.day_start - balance) / self.day_start
        if daily >= MAX_DAILY_LOSS:
            self.halted = True; self.halt_reason = f"Daily loss {daily*100:.1f}%"
            telegram(f"🛑 <b>Daily Loss Limit</b>\n{self.halt_reason}")
            return False
        return True

    def size(self, balance, confidence, vol_score, fg_score):
        base    = balance * RISK_PER_TRADE
        vol_adj = 1 - (vol_score * 0.5)

        # ③ Fear & Greed size adjustment
        if fg_score <= FEAR_EXTREME:
            fg_adj = 0.5    # extreme fear → half size
        elif fg_score >= GREED_EXTREME:
            fg_adj = 0.75   # extreme greed → reduce size
        else:
            fg_adj = 1.0

        return round(base * confidence * vol_adj * fg_adj, 2)

    def new_day(self, balance):
        self.day_start = balance
        if 'Daily' in self.halt_reason:
            self.halted = False; self.halt_reason = ''


# ══════════════════════════════════════════════════════════════════════════════
# ① PAPER TRADER — with TRAILING STOP LOSS
# ══════════════════════════════════════════════════════════════════════════════

class PaperTrader:
    def __init__(self, balance):
        self.balance   = balance
        self.positions = {}    # pair → {size, entry, cost, peak_price, open_time}
        self.trade_log = []
        self.wins      = 0
        self.losses    = 0

    # ── Auto-exit: Trailing Stop + Hard Floor + Take Profit ──────────────────
    def check_exits(self, tickers: dict) -> list:
        """
        For every open position, check:
          1. Take Profit   — price reached +TAKE_PROFIT_PCT from entry
          2. Trailing Stop — price dropped TRAIL_PCT below rolling peak
          3. Hard Floor    — price dropped HARD_FLOOR_PCT below entry (safety net)
        Updates peak_price on every call.
        """
        closed = []
        for pair, pos in list(self.positions.items()):
            if pair not in tickers or tickers[pair] is None:
                continue

            price = tickers[pair]['price']
            entry = pos['entry']

            # Update rolling peak (highest price seen since entry)
            if price > pos['peak_price']:
                pos['peak_price'] = price
                log.debug(f"  Peak updated {pair}: ${price:.4f}")

            peak   = pos['peak_price']
            change = (price - entry) / entry    # % from entry
            from_peak = (price - peak) / peak   # % below peak

            exit_reason = None

            # ── Take Profit ──
            if change >= TAKE_PROFIT_PCT:
                exit_reason = f"TP +{change*100:.2f}% from entry"

            # ── Trailing Stop ──
            elif from_peak <= -TRAIL_PCT:
                if change > 0:
                    exit_reason = f"Trail stop {from_peak*100:.2f}% from peak (locked +{change*100:.2f}%)"
                else:
                    exit_reason = f"Trail stop {from_peak*100:.2f}% from peak ({change*100:.2f}% from entry)"

            # ── Hard Floor ──
            elif change <= -HARD_FLOOR_PCT:
                exit_reason = f"Hard floor {change*100:.2f}% — max loss hit"

            if exit_reason:
                value = pos['size'] * price
                pnl   = value - pos['cost']
                self.balance += value
                if pnl >= 0: self.wins += 1
                else:         self.losses += 1

                del self.positions[pair]

                trade = {
                    'id':         len(self.trade_log) + 1,
                    'pair':       pair,
                    'action':     'SELL',
                    'price':      price,
                    'size_usd':   round(value, 2),
                    'units':      round(pos['size'], 4),
                    'confidence': 0.0,
                    'ml_prob':    0.0,
                    'sentiment':  0.0,
                    'time':       datetime.now().isoformat(),
                    'pnl':        round(pnl, 4),
                    'pnl_pct':    round(pnl / pos['cost'] * 100, 2),
                    'status':     'CLOSED',
                    'reasons':    [exit_reason, f"Entry: ${entry:.4f}", f"Peak: ${peak:.4f}", f"Exit: ${price:.4f}"]
                }
                self.trade_log.append(trade)
                closed.append((trade, exit_reason))
                log.info(f"  💰 EXIT {pair} | {exit_reason} | P&L: ${pnl:+.4f}")

        return closed

    # ── Signal-driven entry / exit ────────────────────────────────────────────
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
                'size':       units,
                'entry':      price,
                'cost':       size_usd,
                'peak_price': price,         # ← trailing stop tracks this
                'open_time':  datetime.now().isoformat()
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
    pnl   = (f"\n💰 P&L: <b>${trade['pnl']:+.4f} "
             f"({trade.get('pnl_pct', 0):+.2f}%)</b>") if trade['pnl'] is not None else ""
    r_list = reasons or trade.get('reasons', [])
    steps  = "\n".join(f"  • {r}" for r in r_list[:4])
    return (
        f"{emoji} <b>{trade['action']} {trade['pair']}</b>\n"
        f"Price: ${trade['price']:.4f} | Size: ${trade['size_usd']:.2f}{pnl}\n"
        f"<b>Reason:</b>\n{steps}"
    )

def fmt_hourly(trader, signals, btc_status, fg_score):
    sig_lines = ""
    for pair, sig in signals.items():
        block_icon = "🚨" if sig.get('btc_block') == 2 else ("⚠" if sig.get('btc_block') == 1 else "")
        sig_lines += (f"\n{block_icon}{pair}: {sig.get('action','—')} | "
                      f"RSI {sig.get('rsi_val',0):.0f} | ML {sig.get('ml_prob',0.5)*100:.0f}% | "
                      f"News {sig.get('sentiment',0):+.2f}")
    return (
        f"📊 <b>Hourly Update — NaliBot v4</b>\n"
        f"Balance:  ${trader.balance:.2f}\n"
        f"P&L:      ${trader.total_pnl:+.2f}\n"
        f"Win Rate: {trader.win_rate:.1f}%\n"
        f"Trades:   {trader.wins + trader.losses}\n"
        f"BTC 1h:   {btc_status.get('momentum_1h',0)*100:+.2f}% | "
        f"F&G: {fg_score}/100\n"
        f"{sig_lines}"
    )


# ══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ══════════════════════════════════════════════════════════════════════════════

def main():
    log.info("=" * 60)
    log.info("  NaliBot v4  ·  Trailing Stop  ·  BTC Filter  ·  CryptoPanic")
    log.info("=" * 60)

    ml        = MLSignal()
    sentiment = SentimentSignal()
    vol_sig   = VolatilitySignal()
    btc_filt  = BTCFilter()
    trader    = PaperTrader(PAPER_BALANCE)
    guard     = RiskGuard(PAPER_BALANCE)

    last_hourly  = datetime.now()
    last_day     = datetime.now().date()
    loop         = 0
    last_signals = {}
    last_prices  = {}

    # Warm up Fear & Greed and BTC filter on start
    fg_score   = sentiment.fear_greed()
    btc_status = btc_filt.update()

    telegram(
        f"🚀 <b>NaliBot v4 Started</b>\n"
        f"✅ Trailing Stop: {TRAIL_PCT*100:.1f}% from peak\n"
        f"✅ BTC Filter: blocks BUY if BTC &lt;{BTC_DROP_BLOCK*100:.1f}%/1h\n"
        f"✅ CryptoPanic sentiment {'+ API key' if CRYPTOPANIC_KEY else '(public)'}\n"
        f"✅ Fear &amp; Greed: {fg_score}/100\n"
        f"Pairs: {', '.join(TRADING_PAIRS)} | Conf: {MIN_SIGNAL_CONF:.0%}\n"
        f"Balance: ${PAPER_BALANCE:,.2f}"
    )

    while True:
        try:
            loop += 1
            log.info(f"\n{'─'*55}")
            log.info(f"Loop #{loop} | {datetime.now().strftime('%H:%M:%S')}")

            # Daily reset
            today = datetime.now().date()
            if today != last_day:
                guard.new_day(trader.balance)
                last_day = today
                telegram(f"🌅 <b>New Day</b>\n{trader.summary()}")

            if not guard.check(trader.balance):
                save_state(trader, last_signals, last_prices, btc_status, fg_score)
                time.sleep(LOOP_INTERVAL_SEC)
                continue

            # ── Step 1: BTC filter + F&G (once per loop) ──────────────────
            btc_status = btc_filt.update()
            fg_score   = sentiment.fear_greed()
            log.info(f"  BTC: {btc_status['reason']} | F&G: {fg_score}/100")

            # ── Step 2: Fetch current prices ──────────────────────────────
            tickers = {}
            for pair in TRADING_PAIRS:
                t = get_ticker(pair)
                if t:
                    tickers[pair] = t

            # ── Step 3: Trailing Stop / TP / Hard Floor checks ────────────
            if trader.positions:
                exits = trader.check_exits(tickers)
                for trade, reason in exits:
                    telegram(fmt_trade(trade))
                if exits:
                    save_state(trader, last_signals, last_prices, btc_status, fg_score)

            # ── Step 4: Signal analysis + execution ───────────────────────
            for pair in TRADING_PAIRS:
                log.info(f"▶ {pair}")
                df = get_ohlc(pair, interval=5, count=100)
                if df.empty:
                    continue
                ticker = tickers.get(pair)
                if not ticker:
                    continue

                ind    = compute_indicators(df)
                signal = generate_signal(ind, ticker, ml, sentiment,
                                         vol_sig, btc_status, fg_score)

                last_prices[pair]  = {'price': ind['price'], 'rsi': ind['rsi'],
                                      'time': datetime.now().isoformat()}
                last_signals[pair] = signal

                log.info(
                    f"  ${ind['price']:.4f} | RSI:{ind['rsi']:.1f} | "
                    f"MACD:{ind['macd_hist']:+.5f} | BB:{ind['bb_pct']:.2f} | "
                    f"ML:{signal['ml_prob']*100:.0f}% | "
                    f"News:{signal['sentiment']:+.2f} | BTC blk:{btc_status['block']}"
                )
                log.info(
                    f"  → {signal['action']} | Conf:{signal['confidence']*100:.0f}% "
                    f"[bull:{signal['bullish']} bear:{signal['bearish']}]"
                )

                if signal['action'] != 'HOLD':
                    size  = guard.size(trader.balance, signal['confidence'],
                                       signal['vol_score'], fg_score)
                    trade = trader.execute(signal, ticker, size)
                    if trade:
                        tag = "OPENED" if trade['pnl'] is None else f"CLOSED P&L:${trade['pnl']:+.4f}"
                        log.info(f"  ✅ {tag} ${trade['size_usd']:.2f}")
                        telegram(fmt_trade(trade, signal['reasons']))
                    else:
                        log.info(f"  ⏭ No trade (position check or no capital)")

                time.sleep(0.5)

            # ── Step 5: Save state ────────────────────────────────────────
            save_state(trader, last_signals, last_prices, btc_status, fg_score)
            log.info(f"Portfolio: {trader.summary()}")

            # Hourly summary
            if (datetime.now() - last_hourly).seconds >= 3600:
                last_hourly = datetime.now()
                telegram(fmt_hourly(trader, last_signals, btc_status, fg_score), silent=True)

            log.info(f"Sleeping {LOOP_INTERVAL_SEC}s...")
            time.sleep(LOOP_INTERVAL_SEC)

        except KeyboardInterrupt:
            log.info("Bot stopped.")
            telegram(f"🛑 <b>NaliBot Stopped</b>\n{trader.summary()}")
            break
        except Exception as e:
            log.error(f"Loop error: {e}", exc_info=True)
            telegram(f"⚠️ <b>Error</b>\n{str(e)}", silent=True)
            time.sleep(30)


if __name__ == '__main__':
    main()
