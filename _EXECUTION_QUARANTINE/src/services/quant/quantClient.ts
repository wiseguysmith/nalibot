import axios from "axios";
import { QUANT_API_URL, QUANT_TIMEOUT_MS, QUANT_RETRY_COUNT } from "./quantConfig";
import { QuantSignalResponse } from "./quantTypes";

export async function fetchQuantSignal(
  endpoint: string,
  symbol: string
): Promise<QuantSignalResponse | null> {
  const url = `${QUANT_API_URL}/alpha/${endpoint}/${symbol}`;

  for (let attempt = 1; attempt <= QUANT_RETRY_COUNT; attempt++) {
    const start = Date.now();
    try {
      const res = await axios.get(url, { timeout: QUANT_TIMEOUT_MS });
      const latency = Date.now() - start;

      console.log(`[QUANT] ${endpoint} for ${symbol}:`, res.data.signal, "Latency:", latency, "ms");

      return {
        ...res.data,
        latency_ms: latency,
      };
    } catch (err) {
      if (attempt === QUANT_RETRY_COUNT) {
        console.error(`[QUANT] Fetch failed after ${attempt} attempts →`, err);
        return null;
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }

  return null;
}

export async function fetchCombinedSignal(symbol: string): Promise<number> {
  const result = await fetchQuantSignal("combined", symbol);
  const signal = result?.signal ?? 0;
  
  console.log("[QUANT] Combined:", signal, "Latency:", result?.latency_ms ?? 0, "ms");
  
  return signal;
}

