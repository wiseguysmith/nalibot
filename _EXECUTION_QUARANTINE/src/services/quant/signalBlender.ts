/**
 * Unified Signal Blender
 * Hybrid model combining technical analysis + quant signals
 */

import { QuantSignals } from "./quantApiClient";
import { db } from "../db";

export interface BlendedSignal {
  value: number;
  technicalWeight: number;
  quantWeight: number;
  components: {
    technical: number;
    speed: number;
    microstructure: number;
    oi: number;
    options: number;
    sentiment: number;
    volatility: number;
  };
}

/**
 * Blend technical and quant signals
 * Technical = 40%
 * Quant = 60% spread across modules
 */
export async function blendSignals(
  symbol: string,
  technical: number,
  quant: QuantSignals
): Promise<BlendedSignal> {
  // Normalize technical signal to [-1, 1]
  const normalizedTechnical = Math.max(-1, Math.min(1, technical));

  // Normalize quant signals to [-1, 1]
  // Note: volatility is [0, 1], convert to [-1, 1]
  const normalizedVolatility = (quant.volatility - 0.5) * 2;

  // Weights
  const weights = {
    technical: 0.4,
    speed: 0.15,
    microstructure: 0.15,
    oi: 0.1,
    options: 0.1,
    sentiment: 0.05,
    volatility: 0.05,
  };

  // Calculate weighted combination
  const blendedValue =
    weights.technical * normalizedTechnical +
    weights.speed * quant.speed +
    weights.microstructure * quant.microstructure +
    weights.oi * quant.oi +
    weights.options * quant.options +
    weights.sentiment * quant.sentiment +
    weights.volatility * normalizedVolatility;

  // Clamp to [-1, 1]
  const finalSignal = Math.max(-1, Math.min(1, blendedValue));

  const result: BlendedSignal = {
    value: finalSignal,
    technicalWeight: weights.technical,
    quantWeight: 0.6, // Sum of all quant weights
    components: {
      technical: normalizedTechnical,
      speed: quant.speed,
      microstructure: quant.microstructure,
      oi: quant.oi,
      options: quant.options,
      sentiment: quant.sentiment,
      volatility: normalizedVolatility,
    },
  };

  // Save combined signal to database
  try {
    await db.signal.create({
      data: {
        symbol,
        source: "combined",
        value: finalSignal,
      },
    });
  } catch (dbError) {
    console.warn("[SIGNAL BLENDER] Failed to save combined signal to DB:", dbError);
  }

  // Debug logging
  console.log(
    `[SIGNAL BLENDER] Blended signal for ${symbol}: ${finalSignal.toFixed(3)}`
  );
  console.log(
    `  Technical: ${normalizedTechnical.toFixed(3)} (${(weights.technical * 100).toFixed(0)}%)`
  );
  console.log(
    `  Quant Combined: ${quant.combined.toFixed(3)} (${(0.6 * 100).toFixed(0)}%)`
  );
  console.log(
    `  Components: speed=${quant.speed.toFixed(3)}, micro=${quant.microstructure.toFixed(3)}, oi=${quant.oi.toFixed(3)}`
  );

  return result;
}

/**
 * Normalize signal to [-1, 1] range
 */
export function normalizeSignal(value: number, min: number = -1, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}

