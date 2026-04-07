"use client";

import { useState, useEffect, useCallback } from "react";

const RISK_STATS = [
  { label: "Max Drawdown",     value: "20%",  color: "var(--foreground)" },
  { label: "Daily Loss Limit", value: "15%",  color: "var(--foreground)" },
  { label: "Risk Per Trade",   value: "8%",   color: "var(--foreground)" },
  { label: "ML Weight",        value: "30%",  color: "var(--blue)"       },
];

interface Trade {
  id: number; pair: string; action: string; price: number;
  size_usd: number; pnl: number | null; pnl_pct?: number;
  confidence: number; ml_prob: number; sentiment: number;
  time: string; status: string; reasons: string[];
}

interface Signal {
  action: string; confidence: number; ml_prob: number;
  sentiment: number; vol_score: number; rsi_val: number;
  bullish: number; bearish: number; price: number; timestamp: string;
}

interface Portfolio {
  balance: number; pnl: number; pnlPct: number;
  winRate: number; trades: number; wins: number;
  losses: number; openPositions: number;
}

interface BotState {
  portfolio: Portfolio;
  trades: Trade[];
  signals: Record<string, Signal>;
  prices: Record<string, { price: number; rsi: number; time: string }>;
  lastUpdate: string;
}

function StatCard({ label, value, sub, color, live }: { label: string; value: string; sub?: string; color?: string; live?: boolean }) {
  return (
    <div className="card">
      <div className="stat-label" style={{ display: "flex", alignItems: "center" }}>
        {label}
        {live && <span className="dot dot-green pulse" style={{ marginLeft: "auto" }} />}
      </div>
      <div className="stat-value" style={{ color: color || "var(--foreground)" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

function ConnectionStatus({ label, connected, detail }: { label: string; connected: boolean; detail: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span className={`dot dot-${connected ? "green" : "red"} ${connected ? "pulse" : ""}`} />
        <span style={{ fontSize: "0.875rem" }}>{label}</span>
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{detail}</span>
    </div>
  );
}

const START_BALANCE  = 1000.0;
const TARGET_BALANCE = 2000.0;

export default function Dashboard() {
  const [time, setTime]             = useState(new Date());
  const [botRunning, setBotRunning] = useState(true);
  const [mode]                      = useState("simulation");
  const [kraken, setKraken]         = useState<{ totalBalance: number; prices: { xrp: number; btc: number } } | null>(null);
  const [botState, setBotState]     = useState<BotState | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchKraken = useCallback(async () => {
    try {
      const res  = await fetch("/api/kraken");
      const data = await res.json();
      if (data.success) { setKraken(data); }
    } catch {}
  }, []);

  const fetchBotState = useCallback(async () => {
    try {
      const res  = await fetch("/api/trades");
      const data = await res.json();
      if (data.success) {
        setBotState(data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchKraken();
    fetchBotState();
    const k = setInterval(fetchKraken, 120000);
    const b = setInterval(fetchBotState, 15000);   // bot state every 15s
    return () => { clearInterval(k); clearInterval(b); };
  }, [fetchKraken, fetchBotState]);

  const p         = botState?.portfolio;
  const balance   = p?.balance ?? START_BALANCE;
  const pnl       = p?.pnl ?? 0;
  const pnlPct    = p?.pnlPct ?? 0;
  const progress  = Math.min(((balance - START_BALANCE) / (TARGET_BALANCE - START_BALANCE)) * 100, 100);
  const trades    = botState?.trades?.slice().reverse() ?? [];
  const signals   = botState?.signals ?? {};
  const krakenConnected = !!kraken;
  const botActive = !!botState?.lastUpdate;

  return (
    <div style={{ minHeight: "100vh", padding: "1.5rem", maxWidth: "1280px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            NaliBot <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "1rem" }}>v2 · ML + Sentiment</span>
          </h1>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
            {time.toLocaleDateString()} · {time.toLocaleTimeString()}
            {lastUpdated && <span style={{ marginLeft: "0.75rem", color: "var(--green)" }}>· Bot updated {lastUpdated}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={`badge badge-${mode === "simulation" ? "yellow" : "green"}`}>
            <span className="dot" style={{ background: "var(--yellow)" }} /> Simulation
          </span>
          <button onClick={() => { fetchKraken(); fetchBotState(); }}
            style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.8rem", background: "transparent", color: "var(--muted)" }}>
            ↻ Refresh
          </button>
          <button onClick={() => setBotRunning(!botRunning)}
            style={{ padding: "0.4rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", background: botRunning ? "rgba(248,81,73,0.15)" : "rgba(63,185,80,0.15)", color: botRunning ? "var(--red)" : "var(--green)" }}>
            {botRunning ? "Stop Bot" : "Start Bot"}
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
        <StatCard label="Paper Balance" value={`$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          sub={krakenConnected ? `Kraken: $${kraken!.totalBalance.toFixed(2)}` : "Kraken pending"} live={botActive} />
        <StatCard label="Total P&L" value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
          sub={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% return`}
          color={pnl >= 0 ? "var(--green)" : "var(--red)"} />
        <StatCard label="Win Rate" value={`${p?.winRate?.toFixed(1) ?? "0.0"}%`}
          sub={`${p?.wins ?? 0}W · ${p?.losses ?? 0}L · ${p?.trades ?? 0} total`} color="var(--blue)" />
        <StatCard label="XRP Price" value={kraken ? `$${kraken.prices.xrp.toFixed(4)}` : "—"}
          sub={kraken ? `BTC $${kraken.prices.btc.toLocaleString()}` : "Connecting..."} color="var(--purple)" live={krakenConnected} />
        <StatCard label="Open Positions" value={`${p?.openPositions ?? 0}`}
          sub="Active paper trades" color={p?.openPositions ? "var(--yellow)" : "var(--muted)"} />
      </div>

      {/* ── Progress Bar ── */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Progress to Goal</span>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--blue)" }}>{Math.max(0, progress).toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.max(0, progress)}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.375rem", fontSize: "0.7rem", color: "var(--muted)" }}>
          <span>${START_BALANCE.toLocaleString()} start</span>
          <span>${TARGET_BALANCE.toLocaleString()} target (2x)</span>
        </div>
      </div>

      {/* ── Live Signals ── */}
      {Object.keys(signals).length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="dot dot-green pulse" /> Live Signals
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Object.keys(signals).length}, 1fr)`, gap: "1rem" }}>
            {Object.entries(signals).map(([pair, sig]) => (
              <div key={pair} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: `1px solid ${sig.action === "BUY" ? "rgba(63,185,80,0.3)" : sig.action === "SELL" ? "rgba(248,81,73,0.3)" : "var(--border)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{pair.replace("USD", "/USD").replace("USDT", "/USDT")}</span>
                  <span className={`badge badge-${sig.action === "BUY" ? "green" : sig.action === "SELL" ? "red" : "yellow"}`}>{sig.action}</span>
                </div>
                <div style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {[
                    { label: "Price",      value: `$${sig.price?.toFixed(4) ?? "—"}` },
                    { label: "RSI",        value: sig.rsi_val?.toFixed(1) ?? "—" },
                    { label: "Confidence", value: `${(sig.confidence * 100).toFixed(0)}%` },
                    { label: "ML Signal",  value: `${(sig.ml_prob * 100).toFixed(0)}% bullish` },
                    { label: "Sentiment",  value: `${sig.sentiment >= 0 ? "+" : ""}${sig.sentiment?.toFixed(2) ?? "—"}` },
                    { label: "Bull/Bear",  value: `${sig.bullish ?? 0} / ${sig.bearish ?? 0}` },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>{r.label}</span>
                      <span style={{ fontWeight: 600 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>

        {/* Trades */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            Live Trade Log {trades.length > 0 && <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.75rem" }}>({trades.length} trades)</span>}
          </div>
          {trades.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
              Watching market — first trade fires when signal confidence ≥ 35%
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Pair</th><th>Type</th><th>Size</th><th>Price</th><th>ML</th><th>P&L</th><th>Time</th></tr>
              </thead>
              <tbody>
                {trades.slice(0, 15).map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.pair.replace("USD", "/USD").replace("USDT", "/USDT")}</td>
                    <td><span className={`badge badge-${t.action === "BUY" ? "green" : "red"}`}>{t.action}</span></td>
                    <td>${t.size_usd.toFixed(2)}</td>
                    <td style={{ fontFamily: "var(--font-geist-mono)" }}>${t.price.toFixed(4)}</td>
                    <td style={{ color: "var(--blue)" }}>{(t.ml_prob * 100).toFixed(0)}%</td>
                    <td style={{ color: t.pnl === null ? "var(--muted)" : t.pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                      {t.pnl === null ? <span style={{ color: "var(--yellow)" }}>Open</span> : `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(4)}`}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{new Date(t.time).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Connections + Risk */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Connections</div>
          <ConnectionStatus label="Kraken API"    connected={krakenConnected} detail={krakenConnected ? `Live · $${kraken!.totalBalance.toFixed(2)}` : "Connecting..."} />
          <ConnectionStatus label="BotNali Bot"   connected={botActive}       detail={botActive ? "Running · Telegram active" : "Offline"} />
          <ConnectionStatus label="ML Model"      connected={true}            detail="RandomForest · 93.8% acc" />
          <ConnectionStatus label="Sentiment"     connected={true}            detail="GitHub activity · 10min cache" />
          <ConnectionStatus label="Risk Governor" connected={botRunning}      detail={botRunning ? "Watching" : "Offline"} />

          <div style={{ marginTop: "1rem", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Risk Config</div>
          <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {RISK_STATS.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{r.label}</span>
                <span style={{ color: r.color, fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {botState?.lastUpdate && (
            <div style={{ marginTop: "1rem", fontSize: "0.7rem", color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
              Last bot cycle: {new Date(botState.lastUpdate).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.7rem", color: "var(--muted)" }}>
        NaliBot v2 · Paper Trading · ML + Sentiment + Volatility Signals · Auto-refreshes every 15s
      </div>
    </div>
  );
}
