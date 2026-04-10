"""
NaliBot Launcher — starts the trading bot + dashboard in one command.
Run: python start.py
"""

import sys, os, subprocess, time, webbrowser, signal, threading

DASHBOARD_PORT = 3001
ROOT    = os.path.dirname(os.path.abspath(__file__))
BOT     = os.path.join(ROOT, "bot.py")
DASH    = os.path.join(ROOT, "ai-trading-bot")
ENV     = os.path.join(ROOT, "config", "production.env")
MODEL   = os.path.join(ROOT, "models", "signal_model.pkl")

processes = []

def stop_all(sig=None, frame=None):
    print("\n  Shutting down...")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT,  stop_all)
signal.signal(signal.SIGTERM, stop_all)

def banner(msg):
    print(f"\n{'='*55}")
    print(f"  {msg}")
    print(f"{'='*55}\n")

# ── Pre-flight checks ─────────────────────────────────────────────────────────
banner("NaliBot Starting Up")

if not os.path.exists(ENV):
    print("  No credentials found. Running setup first...\n")
    subprocess.run([sys.executable, os.path.join(ROOT, "setup.py")])
    if not os.path.exists(ENV):
        print("  Setup incomplete. Exiting.")
        sys.exit(1)

if not os.path.exists(MODEL):
    print("  ML model not found — training now (takes ~2 min)...")
    train = os.path.join(ROOT, "train_model.py")
    subprocess.run([sys.executable, "-X", "utf8", train])

# ── Start bot ─────────────────────────────────────────────────────────────────
print("  [1/2] Starting trading bot...")
bot_proc = subprocess.Popen(
    [sys.executable, "-X", "utf8", BOT],
    cwd=ROOT,
    env={**os.environ, "PYTHONIOENCODING": "utf-8"}
)
processes.append(bot_proc)
time.sleep(2)

if bot_proc.poll() is not None:
    print("  ERROR: Bot failed to start. Check that setup.py completed successfully.")
    sys.exit(1)
print("  Bot running.")

# ── Start dashboard ───────────────────────────────────────────────────────────
node_check = subprocess.run(["node", "--version"], capture_output=True, text=True)
dash_proc  = None

if node_check.returncode == 0 and os.path.exists(DASH):
    print(f"  [2/2] Starting dashboard on port {DASHBOARD_PORT}...")
    dash_proc = subprocess.Popen(
        ["node", "node_modules/.bin/next", "dev", f"--port={DASHBOARD_PORT}"],
        cwd=DASH,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    processes.append(dash_proc)
    time.sleep(4)

    if dash_proc.poll() is None:
        url = f"http://localhost:{DASHBOARD_PORT}"
        print(f"  Dashboard running at {url}")
        webbrowser.open(url)
    else:
        print("  Dashboard failed to start (bot still running).")
else:
    print("  [2/2] Skipping dashboard (Node.js not installed).")

# ── Live log relay ────────────────────────────────────────────────────────────
print("""
  NaliBot is live. Press Ctrl+C to stop everything.
  ─────────────────────────────────────────────────
""")

# Stream bot logs to the terminal so the user can see what's happening
try:
    import subprocess as sp
    log_file = os.path.join(ROOT, "bot.log")
    # Wait for log file to appear
    for _ in range(10):
        if os.path.exists(log_file):
            break
        time.sleep(1)

    if os.path.exists(log_file):
        tail = subprocess.Popen(
            ["python", "-c",
             f"import time,sys; f=open(r'{log_file}'); f.seek(0,2);\n"
             "while True:\n  l=f.readline();\n  print(l,end='',flush=True) if l else time.sleep(0.5)"],
            stdout=sys.stdout, stderr=subprocess.DEVNULL
        )
        processes.append(tail)
        tail.wait()
    else:
        bot_proc.wait()
except KeyboardInterrupt:
    stop_all()
