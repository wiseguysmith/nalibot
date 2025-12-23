@echo off
echo ========================================
echo    AI Trading Bot - $100 Test Setup
echo ========================================
echo.

echo [1/4] Installing dependencies...
npm install

echo.
echo [2/4] Checking for .env file...
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create .env file with your API credentials
    echo See SETUP_GUIDE.md for instructions
    echo.
    pause
)

echo.
echo [3/4] Starting development server...
echo.
echo The bot will be available at: http://localhost:3000
echo.
echo IMPORTANT: Start in TEST MODE first!
echo.

npm run dev 