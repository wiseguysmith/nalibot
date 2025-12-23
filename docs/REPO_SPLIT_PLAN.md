# Repository Split Plan

**Date**: 2024-12-19  
**Status**: PLAN ONLY - NO EXECUTION  
**Safety**: All steps are reversible

## Overview

Split current repository into:
1. **EXECUTION repo** (this repo) - Deterministic, audited, validation-first
2. **LAB repo** (new clone) - Research, Python, notebooks, experiments

## Safety Principles

- ✅ **Never modify EXEC repo first** - Always start with LAB repo
- ✅ **Clone before cleanup** - Create LAB repo from current state
- ✅ **Verify before delete** - Test both repos independently
- ✅ **Explicit checkpoints** - STOP AND CONFIRM at each step
- ✅ **Rollback ready** - Every step has rollback instructions

---

## STEP 1: Create LAB Repository (Clone Current Repo)

**Purpose**: Create a complete copy of current repo as LAB repo

**Commands**:
```bash
# From parent directory of AI-Trading-Bot
cd ..
git clone https://github.com/wiseguysmith/TRADINGBOT.git AI-Trading-Bot-LAB
cd AI-Trading-Bot-LAB
git remote set-url origin <NEW_LAB_REPO_URL>  # Set new remote for LAB repo
```

**Verification**:
- ✅ LAB repo exists
- ✅ LAB repo has all files
- ✅ LAB repo is independent (different remote)

**Rollback**: Delete LAB repo directory if needed

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - LAB repo created successfully?

---

## STEP 2: Clean LAB Repository (Remove EXECUTION Code)

**Purpose**: Remove execution-critical code from LAB repo, keeping only research code

**Files to DELETE from LAB repo**:
- `core/` (EXECUTION - governance, validation)
- `src/` (EXECUTION - Next.js app, operator dashboards)
- `scripts/run-paper-trading.ts` (EXECUTION - validation)
- `scripts/run-validation-mode.ts` (EXECUTION - validation)
- `scripts/run-sentinel-mode.ts` (EXECUTION - validation)
- `scripts/run-confidence-accumulation.ts` (EXECUTION - validation)
- `scripts/run-shadow-mode.js` (EXECUTION - validation)
- `scripts/test-simulation.ts` (EXECUTION - validation)
- `scripts/test-simulation.js` (EXECUTION - validation)
- `scripts/test-real-trade.ts` (EXECUTION - validation)
- `scripts/test-coinbase-jwt-config.js` (EXECUTION - validation)
- `scripts/setup-production.js` (EXECUTION - production)
- `main.js` (EXECUTION - entry point)
- `prisma/` (EXECUTION - database schema)
- `docs/VALIDATION_*.md` (EXECUTION - validation docs)
- `docs/SYSTEM_CONSTITUTION.md` (EXECUTION - system principles)
- `docs/OPERATOR_*.md` (EXECUTION - operator docs)
- `docs/PHASE_*.md` (EXECUTION - phase docs)
- `docs/UI_PRINCIPLES*.md` (EXECUTION - UI principles)
- `docs/CONSTITUTIONAL_*.md` (EXECUTION - constitutional audit)
- `docs/QUICK_START_*.md` (EXECUTION - validation quick start)
- `docs/HOW_TO_START_*.md` (EXECUTION - validation guides)
- `docs/START_SIM_*.md` (EXECUTION - validation guides)
- `docs/PAPER_TRADING_GUIDE.md` (EXECUTION - validation guide)
- `docs/SHADOW_*.md` (EXECUTION - shadow trading docs)
- `docs/PRE_PRODUCTION_*.md` (EXECUTION - production docs)
- `docs/PRODUCTION_*.md` (EXECUTION - production docs)
- `docs/HARDENING_*.md` (EXECUTION - hardening docs)
- `docs/OPERATOR_INTERFACE_*.md` (EXECUTION - operator docs)
- `reports/example-confidence-report.*` (EXECUTION - validation reports)
- `reports/dailyDigest.js` (EXECUTION - production feature)
- All `test-*.js` files in root (EXECUTION - validation tests)
- All `debug-*.js` files (EXECUTION - production support)
- `verify-kraken-setup.js` (EXECUTION - production)
- `enable-mock-trading.js` (EXECUTION - validation)
- `create-env-simple.js` (EXECUTION - production)
- `create-new-keys-guide.js` (EXECUTION - production)
- `monitor-production.js` (EXECUTION - production)
- `start-*.bat` (EXECUTION - production)
- `env-template.txt` (EXECUTION - production)
- `config/` (EXECUTION - production config)
- `package.json` (EXECUTION - Node.js dependencies)
- `tsconfig.json` (EXECUTION - TypeScript config)
- `main.js` (EXECUTION - entry point)
- `LICENSE` (EXECUTION - legal)
- `.gitignore` (EXECUTION - git config)

**Files to KEEP in LAB repo**:
- `modules/` (LAB - Python modules)
- `python_api/` (LAB - Python API)
- `notebooks/` (LAB - Jupyter notebooks)
- `data/` (LAB - CSV data)
- `*.py` (LAB - Python scripts)
- `tests/test_signals.py` (LAB - Python tests)
- `scripts/fetch_market_data.py` (LAB - Python script)
- `scripts/comprehensive-backtest.js` (LAB - research tool)
- `scripts/strategy-optimizer.js` (LAB - research tool)
- `optimizer/` (LAB - research optimizer)
- `src/services/advancedBacktestingEngine.ts` (LAB - research tool)
- `src/scripts/runBacktesting.ts` (LAB - research tool)
- `src/utils/mlModel.ts` (LAB - ML utilities)
- `src/services/mlModel.ts` (LAB - ML model, if exists)
- `ai-trading-bot/` (LAB - experimental Next.js)
- `reports/` (LAB - research reports, except validation ones)
- `docs/BACKTESTING_*.md` (LAB - backtesting docs)
- `docs/QUANT_*.md` (LAB - Python quant docs)
- `docs/SAAS_*.md` (LAB - business planning)
- `QUANT_*.md` (LAB - quant docs)
- `SAAS_*.md` (LAB - business docs)
- `BACKTESTING_*.md` (LAB - backtesting docs)

**Commands** (run in LAB repo):
```bash
cd AI-Trading-Bot-LAB

# Remove execution directories
rm -rf core/
rm -rf src/
rm -rf prisma/
rm -rf scripts/run-paper-trading.ts
rm -rf scripts/run-validation-mode.ts
rm -rf scripts/run-sentinel-mode.ts
rm -rf scripts/run-confidence-accumulation.ts
rm -rf scripts/run-shadow-mode.js
rm -rf scripts/test-simulation.ts
rm -rf scripts/test-simulation.js
rm -rf scripts/test-real-trade.ts
rm -rf scripts/test-coinbase-jwt-config.js
rm -rf scripts/setup-production.js
rm -rf main.js
rm -rf config/
rm -rf start-*.bat
rm -rf monitor-production.js
rm -rf create-*.js
rm -rf verify-*.js
rm -rf enable-*.js
rm -rf debug-*.js
rm -rf test-*.js
rm -rf env-template.txt
rm -rf package.json
rm -rf tsconfig.json
rm -rf LICENSE
rm -rf .gitignore

# Remove execution documentation
rm -rf docs/VALIDATION_*.md
rm -rf docs/SYSTEM_CONSTITUTION.md
rm -rf docs/OPERATOR_*.md
rm -rf docs/PHASE_*.md
rm -rf docs/UI_PRINCIPLES*.md
rm -rf docs/CONSTITUTIONAL_*.md
rm -rf docs/QUICK_START_*.md
rm -rf docs/HOW_TO_START_*.md
rm -rf docs/START_SIM_*.md
rm -rf docs/PAPER_TRADING_GUIDE.md
rm -rf docs/SHADOW_*.md
rm -rf docs/PRE_PRODUCTION_*.md
rm -rf docs/PRODUCTION_*.md
rm -rf docs/HARDENING_*.md
rm -rf docs/OPERATOR_INTERFACE_*.md

# Remove validation reports
rm -rf reports/example-confidence-report.*
rm -rf reports/dailyDigest.js

# Keep only research files
# (modules/, python_api/, notebooks/, data/, *.py, etc.)
```

**Verification**:
- ✅ LAB repo still has Python code
- ✅ LAB repo still has notebooks
- ✅ LAB repo has NO validation scripts
- ✅ LAB repo has NO operator dashboards
- ✅ LAB repo has NO governance code

**Rollback**: Restore from git history or re-clone

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - LAB repo cleaned successfully?

---

## STEP 3: Update LAB Repository Documentation

**Purpose**: Add LAB-specific README and documentation

**Create in LAB repo**:
- `README.md` - LAB repo purpose and usage
- `docs/LAB_PURPOSE.md` - Research and experimentation focus
- Update any remaining docs to clarify LAB context

**Verification**:
- ✅ LAB repo has clear purpose documentation
- ✅ LAB repo README explains research focus

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - LAB repo documentation updated?

---

## STEP 4: Commit and Push LAB Repository

**Purpose**: Save cleaned LAB repo state

**Commands** (run in LAB repo):
```bash
cd AI-Trading-Bot-LAB

# Stage all deletions
git add -A

# Commit cleanup
git commit -m "chore: Split repo - remove execution code, keep research code

- Removed all TypeScript execution code (core/, src/)
- Removed validation scripts (run-validation-mode.ts, etc.)
- Removed operator dashboards and APIs
- Removed production documentation
- Kept Python research code (modules/, python_api/)
- Kept Jupyter notebooks (notebooks/)
- Kept research tools (backtesting, optimizer)
- This repo is now LAB-only for research and experimentation"

# Push to LAB repo remote
git push origin main
```

**Verification**:
- ✅ LAB repo pushed successfully
- ✅ LAB repo is independent
- ✅ LAB repo contains only research code

**Rollback**: Can restore from git history

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - LAB repo pushed successfully?

---

## STEP 5: Verify LAB Repository Independently

**Purpose**: Ensure LAB repo works standalone

**Tests**:
1. ✅ Can import Python modules?
2. ✅ Can run Jupyter notebooks?
3. ✅ Can run Python scripts?
4. ✅ No broken imports from removed files?

**Verification**:
- ✅ LAB repo functions independently
- ✅ No dependencies on execution code

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - LAB repo verified independently?

---

## STEP 6: Clean EXECUTION Repository (Remove LAB Code)

**Purpose**: Remove research code from EXECUTION repo

**⚠️ CRITICAL**: Only proceed after LAB repo is verified and pushed!

**Files to DELETE from EXECUTION repo**:
- `modules/` (LAB - Python modules)
- `python_api/` (LAB - Python API)
- `notebooks/` (LAB - Jupyter notebooks)
- `data/` (LAB - CSV data)
- `websocket_price_feed.py` (LAB - Python script)
- `websocket_integration_example.py` (LAB - Python script)
- `trade_executor.py` (LAB - Python script)
- `strategy_manager.py` (LAB - Python script)
- `risk_manager.py` (LAB - Python script)
- `tests/test_signals.py` (LAB - Python tests)
- `scripts/fetch_market_data.py` (LAB - Python script)
- `scripts/comprehensive-backtest.js` (LAB - research tool)
- `scripts/strategy-optimizer.js` (LAB - research tool)
- `scripts/daily-digest-scheduler.js` (LAB - research/experimental)
- `optimizer/` (LAB - research optimizer)
- `src/services/advancedBacktestingEngine.ts` (LAB - research tool)
- `src/scripts/runBacktesting.ts` (LAB - research tool)
- `src/utils/mlModel.ts` (LAB - ML utilities)
- `src/services/mlModel.ts` (LAB - ML model, if exists)
- `ai-trading-bot/` (LAB - experimental Next.js)
- `docs/BACKTESTING_*.md` (LAB - backtesting docs)
- `docs/QUANT_*.md` (LAB - Python quant docs)
- `docs/SAAS_*.md` (LAB - business planning)
- `QUANT_*.md` (LAB - quant docs)
- `SAAS_*.md` (LAB - business docs)
- `BACKTESTING_*.md` (LAB - backtesting docs)
- `BACKTESTING_README.md` (LAB - backtesting docs)
- `BACKTESTING_IMPLEMENTATION_GUIDE.md` (LAB - backtesting docs)
- `python_api_file_tree.txt` (LAB - Python API docs)

**Commands** (run in EXECUTION repo):
```bash
cd AI-Trading-Bot

# Remove Python/research directories
rm -rf modules/
rm -rf python_api/
rm -rf notebooks/
rm -rf data/
rm -rf optimizer/
rm -rf ai-trading-bot/
rm -rf tests/

# Remove Python scripts
rm -f websocket_price_feed.py
rm -f websocket_integration_example.py
rm -f trade_executor.py
rm -f strategy_manager.py
rm -f risk_manager.py

# Remove research scripts
rm -f scripts/fetch_market_data.py
rm -f scripts/comprehensive-backtest.js
rm -f scripts/strategy-optimizer.js
rm -f scripts/daily-digest-scheduler.js

# Remove research services
rm -f src/services/advancedBacktestingEngine.ts
rm -f src/scripts/runBacktesting.ts
rm -f src/utils/mlModel.ts
rm -f src/services/mlModel.ts

# Remove research documentation
rm -f docs/BACKTESTING_*.md
rm -f docs/QUANT_*.md
rm -f docs/SAAS_*.md
rm -f QUANT_*.md
rm -f SAAS_*.md
rm -f BACKTESTING_*.md
rm -f python_api_file_tree.txt
```

**Verification**:
- ✅ EXECUTION repo still has all validation code
- ✅ EXECUTION repo still has operator dashboards
- ✅ EXECUTION repo has NO Python code
- ✅ EXECUTION repo has NO notebooks
- ✅ Validation scripts still work
- ✅ Operator dashboards still work

**Rollback**: Restore from git history

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - EXECUTION repo cleaned successfully?

---

## STEP 7: Verify EXECUTION Repository

**Purpose**: Ensure EXECUTION repo still functions correctly

**Tests**:
1. ✅ `npm run validation` still works?
2. ✅ `npm run paper-trading` still works?
3. ✅ Operator dashboards load?
4. ✅ API endpoints respond?
5. ✅ No broken imports?

**Verification**:
- ✅ EXECUTION repo functions correctly
- ✅ Validation framework intact
- ✅ Operator interfaces intact
- ✅ No dependencies on removed files

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - EXECUTION repo verified successfully?

---

## STEP 8: Commit and Push EXECUTION Repository

**Purpose**: Save cleaned EXECUTION repo state

**Commands** (run in EXECUTION repo):
```bash
cd AI-Trading-Bot

# Stage all deletions
git add -A

# Commit cleanup
git commit -m "chore: Split repo - remove research code, keep execution code

- Removed Python research code (modules/, python_api/)
- Removed Jupyter notebooks (notebooks/)
- Removed research tools (backtesting, optimizer)
- Removed research documentation
- Kept all validation framework (SIM/SHADOW/SENTINEL)
- Kept all operator dashboards
- Kept all governance and observability code
- This repo is now EXECUTION-only for deterministic, audited trading"

# Push to EXECUTION repo
git push origin main
```

**Verification**:
- ✅ EXECUTION repo pushed successfully
- ✅ EXECUTION repo contains only execution code

**Rollback**: Can restore from git history

**CHECKPOINT**: ✅ **STOP AND CONFIRM** - EXECUTION repo pushed successfully?

---

## Final Verification

**LAB Repository**:
- ✅ Contains only research code
- ✅ Python modules work
- ✅ Notebooks work
- ✅ Independent of execution code

**EXECUTION Repository**:
- ✅ Contains only execution code
- ✅ Validation framework intact
- ✅ Operator dashboards intact
- ✅ No Python dependencies
- ✅ No research code

---

## Rollback Instructions

**If anything goes wrong:**

1. **LAB repo issues**: Delete LAB repo, re-clone from EXECUTION repo
2. **EXECUTION repo issues**: Restore from git history:
   ```bash
   git reset --hard HEAD~1  # Undo last commit
   git push origin main --force  # Force push (if needed)
   ```
3. **Both repos broken**: Restore EXECUTION repo from git, re-clone for LAB

---

## Summary

**Total Steps**: 8  
**Checkpoints**: 8 (one per step)  
**Reversibility**: ✅ All steps reversible  
**Risk Level**: LOW (LAB repo cleaned first, EXECUTION repo verified before cleanup)

**Next Action**: Wait for explicit approval: "Proceed with Step X"
