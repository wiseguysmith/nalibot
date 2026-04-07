import { NextResponse } from "next/server";
import crypto from "crypto";

const KRAKEN_API_KEY = process.env.KRAKEN_API_KEY || "";
const KRAKEN_API_SECRET = process.env.KRAKEN_API_SECRET || "";
const BASE_URL = "https://api.kraken.com";

function getKrakenSignature(path: string, postData: string, secret: string): string {
  const nonce = postData.match(/nonce=(\d+)/)?.[1] || "";
  const message = path + crypto.createHash("sha256").update(nonce + postData).digest("binary");
  const secretBuffer = Buffer.from(secret, "base64");
  return crypto.createHmac("sha512", secretBuffer).update(message, "binary").digest("base64");
}

async function krakenPrivate(endpoint: string, params: Record<string, string> = {}) {
  const nonce = Date.now().toString();
  const path = `/0/private/${endpoint}`;
  const postData = new URLSearchParams({ nonce, ...params }).toString();
  const signature = getKrakenSignature(path, postData, KRAKEN_API_SECRET);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "API-Key": KRAKEN_API_KEY,
      "API-Sign": signature,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: postData,
  });
  return res.json();
}

async function krakenPublic(endpoint: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/0/public/${endpoint}${query ? "?" + query : ""}`);
  return res.json();
}

export async function GET() {
  try {
    const [balanceData, xrpTicker, btcTicker] = await Promise.all([
      krakenPrivate("Balance"),
      krakenPublic("Ticker", { pair: "XRPUSD" }),
      krakenPublic("Ticker", { pair: "XXBTZUSD" }),
    ]);

    const errors = Array.isArray(balanceData.error) ? balanceData.error : [];
    if (errors.length > 0) {
      const isLockout = errors[0].includes("lockout");
      const isAuth = errors[0].includes("Invalid key") || errors[0].includes("Invalid nonce");
      return NextResponse.json({
        success: false,
        error: errors[0],
        lockout: isLockout,
        authError: isAuth,
        // Still return public market data even if private auth failed
        prices: {
          xrp: parseFloat((xrpTicker.result?.XXRPZUSD?.c?.[0] || xrpTicker.result?.XRPUSD?.c?.[0] || "0")),
          btc: parseFloat((btcTicker.result?.XXBTZUSD?.c?.[0] || "0")),
        }
      }, { status: 200 });
    }

    const raw = balanceData.result || {};

    // Parse balances
    const usd = parseFloat(raw["ZUSD"] || raw["USD"] || "0");
    const xrp = parseFloat(raw["XXRP"] || raw["XRP"] || "0");
    const btc = parseFloat(raw["XXBT"] || raw["BTC"] || "0");
    const eth = parseFloat(raw["XETH"] || raw["ETH"] || "0");

    // Parse prices
    const xrpPrice = parseFloat(xrpTicker.result?.XXRPZUSD?.c?.[0] || xrpTicker.result?.XRPUSD?.c?.[0] || "0");
    const btcPrice = parseFloat(btcTicker.result?.XXBTZUSD?.c?.[0] || "0");

    const xrpValue = xrp * xrpPrice;
    const btcValue = btc * btcPrice;
    const totalBalance = usd + xrpValue + btcValue + (eth * 2000);

    return NextResponse.json({
      success: true,
      connected: true,
      timestamp: new Date().toISOString(),
      balances: {
        usd: parseFloat(usd.toFixed(2)),
        xrp: parseFloat(xrp.toFixed(4)),
        btc: parseFloat(btc.toFixed(8)),
        eth: parseFloat(eth.toFixed(6)),
      },
      prices: {
        xrp: parseFloat(xrpPrice.toFixed(4)),
        btc: parseFloat(btcPrice.toFixed(2)),
      },
      values: {
        xrp: parseFloat(xrpValue.toFixed(2)),
        btc: parseFloat(btcValue.toFixed(2)),
      },
      totalBalance: parseFloat(totalBalance.toFixed(2)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
