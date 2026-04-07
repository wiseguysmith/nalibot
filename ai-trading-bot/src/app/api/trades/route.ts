import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "..", "state.json");
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json({
      success: false,
      trades: [],
      portfolio: { balance: 1000, pnl: 0, winRate: 0, trades: 0 },
      signals: {},
      lastUpdate: null
    });
  }
}
