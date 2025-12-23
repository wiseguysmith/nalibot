# Repository Split Analysis

**Date**: 2024-12-19  
**Purpose**: Categorize files for EXECUTION vs LAB split  
**Status**: ANALYSIS ONLY - NO CHANGES MADE

## Analysis Methodology

**EXECUTION-CRITICAL**: Files required for:
- Validation framework (SIM/SHADOW/SENTINEL)
- Governance system
- Operator dashboards
- Production execution pipeline
- Current validation work

**LAB/RESEARCH**: Files for:
- Python research code
- Jupyter notebooks
- Experimental strategies
- Data analysis
- ML model development

**AMBIGUOUS**: Files that need clarification before classification

---

## File Categorization Table

| PATH | CATEGORY | REASON |
|------|----------|--------|
| **CORE EXECUTION INFRASTRUCTURE** |||
| `core/` | **EXECUTION** | All governance, execution, validation, observability code (TypeScript) |
| `src/` | **EXECUTION** | Next.js app, operator dashboards, API routes, services |
| `prisma/` | **EXECUTION** | Database schema (required for production) |
| `package.json` | **EXECUTION** | Node.js dependencies and scripts |
| `tsconfig.json` | **EXECUTION** | TypeScript configuration |
| `main.js` | **EXECUTION** | Entry point for bot execution |
| `.gitignore` | **EXECUTION** | Git configuration |
| `LICENSE` | **EXECUTION** | Legal file |
| **VALIDATION SCRIPTS** |||
| `scripts/run-paper-trading.ts` | **EXECUTION** | SIM mode runner (validation) |
| `scripts/run-validation-mode.ts` | **EXECUTION** | SIM + SHADOW validation runner |
| `scripts/run-sentinel-mode.ts` | **EXECUTION** | SENTINEL mode runner (validation) |
| `scripts/run-confidence-accumulation.ts` | **EXECUTION** | Confidence accumulation (validation) |
| `scripts/run-shadow-mode.js` | **EXECUTION** | Shadow mode runner (validation) |
| `scripts/test-simulation.ts` | **EXECUTION** | Simulation testing (validation) |
| `scripts/test-simulation.js` | **EXECUTION** | Simulation testing (validation) |
| `scripts/test-real-trade.ts` | **EXECUTION** | Real trade testing (validation) |
| `scripts/test-coinbase-jwt-config.js` | **EXECUTION** | Coinbase config testing (validation) |
| `scripts/setup-production.js` | **EXECUTION** | Production setup script |
| **PYTHON / RESEARCH CODE** |||
| `modules/` | **LAB** | All Python modules (research/ML) |
| `python_api/` | **LAB** | Python API (research integration) |
| `notebooks/` | **LAB** | Jupyter notebooks (research) |
| `websocket_price_feed.py` | **LAB** | Python websocket (research) |
| `websocket_integration_example.py` | **LAB** | Python example (research) |
| `trade_executor.py` | **LAB** | Python trade executor (research) |
| `strategy_manager.py` | **LAB** | Python strategy manager (research) |
| `risk_manager.py` | **LAB** | Python risk manager (research) |
| `tests/test_signals.py` | **LAB** | Python tests (research) |
| `scripts/fetch_market_data.py` | **LAB** | Python data fetching (research) |
| `data/` | **LAB** | CSV data files (research data) |
| `notebooks/*.csv` | **LAB** | Notebook data files |
| `notebooks/*.ipynb` | **LAB** | Jupyter notebooks |
| **DOCUMENTATION** |||
| `docs/` | **EXECUTION** | All documentation (system constitution, validation plans, etc.) |
| `README.md` | **EXECUTION** | Main README |
| `SAFETY_GUIDE.md` | **EXECUTION** | Safety documentation |
| `SETUP_GUIDE.md` | **EXECUTION** | Setup documentation |
| `PRODUCTION_SETUP.md` | **EXECUTION** | Production setup docs |
| `KRAKEN_SETUP_GUIDE.md` | **EXECUTION** | Exchange setup (production) |
| `KUCOIN_SETUP_GUIDE.md` | **EXECUTION** | Exchange setup (production) |
| `KRAKEN_API_SETUP_INSTRUCTIONS.md` | **EXECUTION** | Exchange setup (production) |
| `API_SETUP_GUIDE.md` | **EXECUTION** | API setup (production) |
| `BACKTESTING_README.md` | **AMBIGUOUS** | Could be research or validation tool |
| `BACKTESTING_IMPLEMENTATION_GUIDE.md` | **AMBIGUOUS** | Could be research or validation tool |
| **AMBIGUOUS / NEEDS CLARIFICATION** |||
| `scripts/strategy-optimizer.js` | **AMBIGUOUS** | Research tool or production optimizer? |
| `scripts/comprehensive-backtest.js` | **AMBIGUOUS** | Research or validation testing? |
| `scripts/daily-digest-scheduler.js` | **AMBIGUOUS** | Production feature or research? |
| `optimizer/strategyOptimizer.js` | **LAB** | Strategy optimizer (likely research) |
| `strategies/` | **AMBIGUOUS** | Production strategies or research? Need to check if used in validation |
| `src/services/mlModel.ts` | **AMBIGUOUS** | ML model - production or research? |
| `src/utils/mlModel.ts` | **AMBIGUOUS** | ML utilities - production or research? |
| `src/services/advancedBacktestingEngine.ts` | **AMBIGUOUS** | Research tool or validation tool? |
| `src/scripts/runBacktesting.ts` | **AMBIGUOUS** | Research or validation? |
| `test-*.js` (root level) | **AMBIGUOUS** | Which are validation tests vs research tests? |
| `test-api.js` | **AMBIGUOUS** | Validation or research? |
| `test-backtesting.js` | **AMBIGUOUS** | Research tool |
| `test-kraken-connection.js` | **EXECUTION** | Exchange connection testing (validation) |
| `test-kraken-direct.js` | **EXECUTION** | Exchange testing (validation) |
| `test-kucoin.js` | **EXECUTION** | Exchange testing (validation) |
| `test-live-trading.js` | **EXECUTION** | Live trading testing (validation) |
| `test-real-data.js` | **EXECUTION** | Real data testing (validation) |
| `test-telegram.js` | **EXECUTION** | Notification testing (production feature) |
| `test-daily-digest.js` | **EXECUTION** | Daily digest testing (production feature) |
| `test-env.js` | **EXECUTION** | Environment testing (validation) |
| `test-api-format.js` | **EXECUTION** | API format testing (validation) |
| `test-advanced-system.js` | **EXECUTION** | System testing (validation) |
| `debug-*.js` | **EXECUTION** | Debugging tools (production support) |
| `verify-kraken-setup.js` | **EXECUTION** | Exchange verification (production) |
| `enable-mock-trading.js` | **EXECUTION** | Mock trading (validation/testing) |
| `create-env-simple.js` | **EXECUTION** | Environment setup (production) |
| `create-new-keys-guide.js` | **EXECUTION** | Setup tool (production) |
| `monitor-production.js` | **EXECUTION** | Production monitoring |
| `start-*.bat` | **EXECUTION** | Windows startup scripts (production) |
| `env-template.txt` | **EXECUTION** | Environment template (production) |
| `config/.env` | **EXECUTION** | Config file (production) |
| **ROOT LEVEL MARKDOWN FILES** |||
| `DIAGNOSTIC_REPORT.md` | **EXECUTION** | System diagnostics (production) |
| `DIAGNOSTIC_SUMMARY.md` | **EXECUTION** | System diagnostics (production) |
| `EXCHANGE_COMPARISON.md` | **EXECUTION** | Exchange comparison (production decision doc) |
| `IMMEDIATE_ACTION_PLAN.md` | **EXECUTION** | Action plan (production) |
| `IMPLEMENTATION_PLAN.md` | **EXECUTION** | Implementation plan (production) |
| `IMPLEMENTATION_SUMMARY.md` | **EXECUTION** | Implementation summary (production) |
| `LLM_COLLABORATION_README.md` | **EXECUTION** | Meta-documentation (development process) |
| `PROJECT_OVERVIEW.md` | **EXECUTION** | Project overview (production) |
| `QUANT_INTEGRATION_COMPLETE.md` | **LAB** | Python quant integration (research) |
| `QUANT_MODULES_README.md` | **LAB** | Python quant modules (research) |
| `QUANT_UPGRADE_SUMMARY.md` | **LAB** | Python quant upgrade (research) |
| `REAL_MARKET_DATA_IMPLEMENTATION.md` | **EXECUTION** | Production implementation |
| `ROADMAP_TO_WORLD_CLASS.md` | **EXECUTION** | Planning doc (production roadmap) |
| `SAAS_BUSINESS_PLAN.md` | **LAB** | Business planning (not execution code) |
| `SAAS_PLATFORM_ROADMAP.md` | **LAB** | Business planning (not execution code) |
| `STRATEGY_UPDATE_SUMMARY.md` | **EXECUTION** | Strategy update summary (production) |
| `WEBSOCKET_IMPLEMENTATION.md` | **EXECUTION** | Production websocket implementation |
| `XRP_TRADING_SETUP.md` | **EXECUTION** | Exchange setup (production) |
| `PHASE*.md` (root) | **EXECUTION** | Phase documentation (production) |
| `BACKTESTING_README.md` | **LAB** | Backtesting documentation (research tool) |
| `BACKTESTING_IMPLEMENTATION_GUIDE.md` | **LAB** | Backtesting guide (research tool) |
| **NESTED DIRECTORIES** |||
| `ai-trading-bot/` | **LAB** | Nested Next.js project (appears to be duplicate/experimental) |
| `reports/` | **MIXED** | See breakdown below |
| `reports/example-confidence-report.json` | **EXECUTION** | Validation confidence report |
| `reports/example-confidence-report.txt` | **EXECUTION** | Validation confidence report |
| `reports/dailyDigest.js` | **EXECUTION** | Daily digest generator (production feature) |

---

## Summary Statistics

**EXECUTION-CRITICAL**: ~150+ files
- All TypeScript/JavaScript execution code
- All validation scripts
- All operator dashboards
- All governance/observability code
- Production documentation

**LAB/RESEARCH**: ~30+ files
- All Python code (`modules/`, `python_api/`, `*.py`)
- All Jupyter notebooks (`notebooks/`)
- CSV data files
- Python tests

**AMBIGUOUS**: ~25+ files
- Need clarification before moving
- Some test files
- Some strategy files
- Some documentation

---

## Critical Validation Files (MUST NOT BE DISRUPTED)

**DO NOT TOUCH** during split:
- `core/validation/` - ConfidenceGate, RuntimeTracker
- `scripts/run-validation-mode.ts` - Validation runner
- `scripts/run-paper-trading.ts` - SIM mode
- `scripts/run-sentinel-mode.ts` - SENTINEL mode
- `src/pages/operator/simulation.tsx` - SIM dashboard
- `src/pages/operator/confidence.tsx` - Confidence dashboard
- `src/pages/api/observability/*` - All observability APIs
- `docs/VALIDATION_*.md` - All validation documentation
- `docs/SYSTEM_CONSTITUTION.md` - System principles
- `package.json` - Dependencies for validation

---

## Language Boundaries

**TypeScript/JavaScript (EXECUTION)**:
- `core/` - 100% TypeScript
- `src/` - TypeScript/TSX
- `scripts/run-*.ts` - Validation scripts
- `main.js` - Entry point

**Python (LAB)**:
- `modules/` - 100% Python
- `python_api/` - 100% Python
- `*.py` (root) - Python scripts
- `notebooks/*.ipynb` - Python notebooks

**Mixed/Ambiguous**:
- `strategies/` - Mix of `.js` and `.ts` - Need to check usage
- `src/services/mlModel.ts` - TypeScript but ML-related
- Some test files mix languages

---

## Questions Resolved

1. ✅ **`strategies/` directory**: **EXECUTION** - Used in validation (referenced by run-validation-mode.ts)
2. ✅ **`src/services/mlModel.ts`**: **LAB** - ML model (research, file may not exist)
3. ✅ **`src/services/advancedBacktestingEngine.ts`**: **LAB** - Research tool for parameter optimization
4. ✅ **`scripts/comprehensive-backtest.js`**: **LAB** - Research tool (tests multiple parameter combinations)
5. ✅ **`scripts/strategy-optimizer.js`**: **LAB** - Research tool (finds optimal parameters)
6. ✅ **`ai-trading-bot/` nested directory**: **LAB** - Experimental/duplicate Next.js project
7. ✅ **`reports/` directory**: **MIXED** - example-confidence-report.* = EXECUTION, dailyDigest.js = EXECUTION
8. ✅ **Root-level test files**: **RESOLVED** - Most are EXECUTION (validation), test-backtesting.js = LAB
9. ✅ **Backtesting documentation**: **LAB** - Research tool documentation

---

## Next Steps

**STEP 1**: Answer clarification questions above  
**STEP 2**: Review ambiguous files  
**STEP 3**: Create safe split plan  
**STEP 4**: Execute split (only after explicit approval)

**NO CHANGES MADE YET** - This is analysis only.
