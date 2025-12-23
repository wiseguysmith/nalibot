/**
 * Quant API Router
 * Next.js API routes for quant signals (optional UI dashboard integration)
 */

import { NextApiRequest, NextApiResponse } from "next";
import { fetchCombinedSignal, fetchQuantSignal } from "./quantClient";

/**
 * GET /api/quant/:symbol
 * Get combined quant signal for a symbol
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { symbol } = req.query;

    if (!symbol || typeof symbol !== "string") {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    const signal = await fetchCombinedSignal(symbol);
    res.json({ symbol, signal });
  } catch (error) {
    console.error("[QUANT] Error in API route:", error);
    res.status(500).json({
      error: "Failed to get quant signal",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

