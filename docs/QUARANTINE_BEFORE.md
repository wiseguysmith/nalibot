# Execution Files Quarantine - BEFORE State

**Date**: 2024-12-19  
**Action**: Moving execution files to `_EXECUTION_QUARANTINE/`  
**Status**: BEFORE QUARANTINE

## Files/Folders to be Quarantined

### Directories:
- `src/` - Next.js app, operator dashboards, API routes
- `core/` - Governance, execution, validation code
- `prisma/` - Database schema
- `scripts/` - Execution scripts
- `tests/` - Test files

### Files:
- `next.config.js` - Next.js configuration
- `next-env.d.ts` - Next.js TypeScript definitions
- `tsconfig.json` - TypeScript configuration
- `package.json` - Node.js dependencies
- `package-lock.json` - Dependency lock file
- `start-bot.bat` - Windows startup script
- `start-testing.bat` - Windows testing script
- `start-xrp-trading.bat` - Windows XRP trading script
- `monitor-bot.js` - Bot monitoring script
- `monitor-production.js` - Production monitoring script
- `monitor-6hour-session.js` - Session monitoring script
- `main.js` - Entry point

## Files/Folders to REMAIN (LAB Research)

### Directories:
- `python_api/` - Python API (research)
- `modules/` - Python modules (research)
- `optimizer/` - Strategy optimizer (research)
- `notebooks/` - Jupyter notebooks (research)
- `data/` - CSV data files (research)
- `reports/` - Reports (research)
- `ai-trading-bot/` - Experimental Next.js (research)
- `config/` - Configuration files
- `docs/` - Documentation

### Files:
- All `.py` files (Python research scripts)
- All `.ipynb` files (Jupyter notebooks)
- All `.md` files (Documentation)
- `requirements.txt` - Python dependencies
- `.gitignore` - Git configuration
- `LICENSE` - Legal file

---

**Next Step**: Create `_EXECUTION_QUARANTINE/` and move files
