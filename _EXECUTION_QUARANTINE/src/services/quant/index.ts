/**
 * Quant Services Index
 * Central export point for quant service layer
 */

export { fetchQuantSignal, fetchCombinedSignal } from "./quantClient";
export {
  QUANT_API_URL,
  QUANT_TIMEOUT_MS,
  QUANT_RETRY_COUNT,
  QUANT_SIGNAL_WEIGHT,
  TRADITIONAL_SIGNAL_WEIGHT,
} from "./quantConfig";
export type { QuantSignalResponse } from "./quantTypes";
export {
  applyQuantLayer,
  blendSignals,
  checkQuantTradeBlock,
} from "./quantIntegration";

