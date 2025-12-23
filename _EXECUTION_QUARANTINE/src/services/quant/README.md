# Quant Service Integration

TypeScript service layer for integrating Python FastAPI Quant Server with the trading bot.

## Quick Start

### 1. Environment Variables

Add to your `.env` file:

```env
PYTHON_API_URL=http://localhost:8000
QUANT_TIMEOUT_MS=2000
QUANT_RETRY_COUNT=3
QUANT_SIGNAL_WEIGHT=0.5
TRADITIONAL_SIGNAL_WEIGHT=0.5
```

### 2. Usage in Strategy Service

The quant signals are automatically integrated into `StrategyService`. Strategies now:

1. Check quant signals before executing trades
2. Blend quant signals with traditional technical signals
3. Block trades if quant signal is extreme (< -0.8 or > 0.8)

### 3. Manual Usage

```typescript
import { applyQuantLayer, blendSignals, checkQuantTradeBlock } from './services/quant';

// Get quant signal
const quantSignal = await applyQuantLayer('BTCUSDT');

// Blend with technical signal
const technicalSignal = 0.7; // from your strategy
const finalSignal = await blendSignals('BTCUSDT', technicalSignal);

// Check if trade should be blocked
const blockReason = await checkQuantTradeBlock('BTCUSDT', 'buy');
if (blockReason) {
  console.log('Trade blocked:', blockReason);
}
```

## API Endpoints

### GET /api/quant/:symbol

Get combined quant signal for a symbol.

```bash
curl http://localhost:3000/api/quant/BTCUSDT
```

Response:
```json
{
  "symbol": "BTCUSDT",
  "signal": 0.42
}
```

## Files

- `quantConfig.ts` - Configuration (loads from .env)
- `quantTypes.ts` - TypeScript interfaces
- `quantClient.ts` - HTTP client for Python API
- `quantIntegration.ts` - Integration helpers
- `quantRouter.ts` - Next.js API routes (optional)

## Signal Blending

Signals are blended using configurable weights:

```
finalSignal = QUANT_SIGNAL_WEIGHT * quantSignal + TRADITIONAL_SIGNAL_WEIGHT * technicalSignal
```

Default: 50% quant, 50% traditional (adjustable via env vars).

## Trade Blocking

Quant signals can block trades if:
- Signal < -0.8 → Blocks LONG positions
- Signal > 0.8 → Blocks SHORT positions

This prevents trading against extreme quant signals.

