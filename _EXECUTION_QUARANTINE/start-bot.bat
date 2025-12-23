@echo off
echo 🤖 AI Trading Bot - Starting...
echo ========================================

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please run: node create-env-simple.js
    echo Then edit the .env file with your API credentials
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

echo 🚀 Starting AI Trading Bot...
echo.
echo Commands:
echo   Ctrl+C - Stop the bot gracefully
echo.
echo ========================================

REM Start the bot
npm run bot:start

pause
