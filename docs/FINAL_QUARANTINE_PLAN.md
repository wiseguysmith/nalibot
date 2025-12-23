# Final Quarantine Pass - Execution-Adjacent Files

**Date**: 2024-12-19  
**Action**: Moving execution-adjacent JavaScript files to `_EXECUTION_QUARANTINE/`  
**Status**: PLANNING

## Files to Move (Execution-Adjacent)

### Live Exchange Connection Tests:
- `test-live-trading.js` - Tests live trading execution
- `test-kraken-connection.js` - Tests live Kraken connection
- `test-kraken-direct.js` - Tests live Kraken exchange
- `test-kucoin.js` - Tests live KuCoin exchange
- `test-real-data.js` - Tests real market data (implies live)
- `simple-kraken-test.js` - Tests live Kraken API connection

### Exchange Setup & Verification:
- `verify-kraken-setup.js` - Verifies live exchange setup
- `debug-kraken.js` - Debugs live exchange connectivity
- `debug-twilio.js` - Debugs live notification system

### Environment & Configuration Setup:
- `test-env.js` - Tests environment (checks API keys for execution)
- `setup-env.js` - Sets up environment (creates .env with API keys)
- `create-env-simple.js` - Creates environment (execution setup)
- `create-new-keys-guide.js` - Creates API keys (execution setup)

### Production Features:
- `test-telegram.js` - Tests live Telegram notifications
- `test-daily-digest.js` - Tests production daily digest
- `test-api.js` - Tests live API endpoints
- `test-api-format.js` - Tests live API format
- `test-advanced-system.js` - Tests live system
- `enable-mock-trading.js` - Enables trading mode (execution)
- `check-status.js` - Checks live production API status

### Build Artifacts:
- `tsconfig.tsbuildinfo` - TypeScript build artifact

## Files to KEEP (Analysis/Research Only)

- `analyze-trading-results.js` - Analysis only (reads data, doesn't execute)
- `test-backtesting.js` - Tests backtesting (research tool)

---

**Next Step**: Move files to `_EXECUTION_QUARANTINE/`
