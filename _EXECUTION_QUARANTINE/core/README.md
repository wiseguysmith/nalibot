# Core Governance System

## Quick Start

```typescript
import { GovernanceSystem, createTradeRequest } from './governance_integration';

// Initialize
const governance = new GovernanceSystem({
  initialMode: 'OBSERVE_ONLY',
  initialCapital: 1000
});

// Execute trade
const request = createTradeRequest({
  strategy: 'mean_reversion',
  pair: 'BTC/USD',
  action: 'buy',
  amount: 0.01,
  price: 50000
});

const result = await governance.executionManager.executeTrade(request);
```

## Files

- `mode_controller.ts` - System mode management (AGGRESSIVE/OBSERVE_ONLY)
- `riskGovernor.ts` - Risk authority (located in `src/services/`)
- `permission_gate.ts` - Pre-trade authorization
- `execution_manager.ts` - Centralized execution
- `governance_integration.ts` - Integration helpers

## Tests

Run tests: `npm test core/__tests__/governance.test.ts`

## Documentation

See `docs/PHASE_1_GOVERNANCE.md` for complete documentation.

