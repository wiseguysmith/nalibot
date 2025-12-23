/**
 * Quant Integration Helpers
 * Utilities for integrating quant signals with existing trading logic
 * NOTE: This file is kept for backward compatibility
 * New code should use quantApiClient.ts and signalBlender.ts directly
 */

import { getQuantApiClient, QuantSignals } from "./quantApiClient";
import { blendSignals as blendSignalsNew } from "./signalBlender";
import { db } from "../db";

/**
 * Apply quant layer to trading signal
 * Normalizes quant signal and integrates with strategy
 * @deprecated Use getQuantApiClient().getQuantSignals() directly
 */
export async function applyQuantLayer(symbol: string): Promise<number> {
  try {
    const quantApiClient = getQuantApiClient();
    const quantSignals = await quantApiClient.getQuantSignals(symbol);
    const normalizedSignal = Math.max(-1, Math.min(1, quantSignals.combined));
    
    // Save quant signal to database
    try {
      await db.signal.create({
        data: {
          symbol,
          source: "quant",
          value: normalizedSignal,
        },
      });
    } catch (dbError) {
      console.warn("[QUANT] Failed to save signal to DB:", dbError);
    }
    
    return normalizedSignal;
  } catch (error) {
    console.error("[QUANT] Error applying quant layer:", error);
    return 0; // Return neutral signal on error
  }
}

/**
 * Blend traditional technical signals with quant signals
 * @deprecated Use blendSignals from signalBlender.ts with QuantSignals object
 */
export async function blendSignals(
  symbol: string,
  technicalSignal: number
): Promise<number> {
  try {
    // Save technical signal to database
    try {
      await db.signal.create({
        data: {
          symbol,
          source: "technical",
          value: technicalSignal,
        },
      });
    } catch (dbError) {
      console.warn("[QUANT] Failed to save technical signal to DB:", dbError);
    }
    
    // Get quant signals
    const quantApiClient = getQuantApiClient();
    const quantSignals = await quantApiClient.getQuantSignals(symbol);
    
    // Use new signal blender
    const blendedResult = await blendSignalsNew(symbol, technicalSignal, quantSignals);
    
    return blendedResult.value;
  } catch (error) {
    console.error("[QUANT] Error blending signals:", error);
    // Fallback to technical signal if quant fails
    return technicalSignal;
  }
}

/**
 * Check if quant signal should block a trade direction
 * Returns 'BLOCK_LONG', 'BLOCK_SHORT', or null
 */
export async function checkQuantTradeBlock(
  symbol: string,
  direction: "buy" | "sell"
): Promise<"BLOCK_LONG" | "BLOCK_SHORT" | null> {
  try {
    const quantApiClient = getQuantApiClient();
    const quantSignals = await quantApiClient.getQuantSignals(symbol);
    const quantSignal = quantSignals.combined;
    
    // Block long positions if quant signal is very bearish
    if (quantSignal < -0.8 && direction === "buy") {
      console.log(`[RISK MANAGER] Blocking LONG - Quant signal too bearish: ${quantSignal.toFixed(3)}`);
      return "BLOCK_LONG";
    }
    
    // Block short positions if quant signal is very bullish
    if (quantSignal > 0.8 && direction === "sell") {
      console.log(`[RISK MANAGER] Blocking SHORT - Quant signal too bullish: ${quantSignal.toFixed(3)}`);
      return "BLOCK_SHORT";
    }
    
    return null;
  } catch (error) {
    console.error("[QUANT] Error checking trade block:", error);
    return null; // Don't block on error
  }
}
