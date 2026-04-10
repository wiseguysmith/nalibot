# NaliBot — Claude Code Guide

NaliBot is an XRP paper trading bot. It watches live XRP/USD prices from Kraken, generates buy/sell signals using technical indicators + a machine learning model, and executes simulated trades with a $1,000 virtual balance. No real money is ever spent.

## First time? Run setup

```
python setup.py
```

This will walk you through everything: installing packages, entering your Kraken API key and Telegram credentials, and training the ML model. Takes about 3 minutes.

## Start the bot

```
python start.py
```

This starts the trading bot and opens the dashboard in your browser automatically. Press Ctrl+C to stop everything.

## What you need before setup

1. **Kraken account** (free) — go to kraken.com, create an account, then go to Settings → API → Create Key. Enable "Query Funds" and "Query Orders". Copy the key and secret.

2. **Telegram bot** (free, for trade alerts on your phone):
   - Open Telegram, message `@BotFather`, type `/newbot`, follow the steps, copy the token it gives you
   - Then message `@userinfobot` — it replies with your Chat ID number

## Key files

| File | What it does |
|---|---|
| `bot.py` | Main trading bot — loops every 60 seconds |
| `start.py` | Starts everything with one command |
| `setup.py` | First-time setup wizard |
| `train_model.py` | Trains the ML model (runs automatically daily) |
| `run_10_paper_trades.py` | Runs a quick 10-trade simulation on historical data |
| `config/production.env` | Your credentials (never share this file) |
| `models/signal_model.pkl` | Trained ML model |
| `state.json` | Live bot state — read by the dashboard |
| `bot.log` | Full log of every loop and trade |

## Dashboard

The dashboard runs at `http://localhost:3001` and shows:
- Live balance and P&L
- Open positions
- Signal breakdown (RSI, MACD, ML score, sentiment)
- Trade history

## Common tasks (just ask Claude)

- "Run the bot" → runs `start.py`
- "Run 10 paper trades" → runs `run_10_paper_trades.py`
- "Retrain the ML model" → runs `train_model.py`
- "Show me the last few trades" → reads `state.json` or `bot.log`
- "How is the bot doing?" → reads `state.json` and summarises

## How the bot decides to trade

Every 60 seconds it checks 10 signals and votes:

1. RSI (is XRP oversold or overbought?)
2. MACD (is momentum shifting?)
3. Bollinger Bands (is price near the edge of its range?)
4. EMA trend (short-term vs long-term moving average)
5. Momentum (5-bar price change)
6. Volume spike (unusual buying/selling activity?)
7. News sentiment (CryptoPanic headlines)
8. BTC momentum (is the whole crypto market moving?)
9. Volatility guard (reduces size in wild markets)
10. XRP/BTC ratio (is XRP outperforming BTC specifically?)

Plus a machine learning model trained on 20 days of XRP history.

A BUY fires when the votes lean bullish with enough confidence. A 15-minute cooldown prevents re-entering immediately after a stop-loss.

## Risk controls

- Max 20% portfolio drawdown → bot pauses automatically
- Max 15% loss per day → bot pauses until next day
- 8% of balance risked per trade
- Take profit at +2.5%
- Trailing stop at 1.2% below peak price
- Hard stop at -2.5% from entry

## Notes

- This is paper trading only — no real money is ever at risk
- The ML model retrains itself every night automatically
- Telegram alerts fire on every trade entry, exit, and hourly summary
- The bot works without a Telegram token (just no phone alerts)
