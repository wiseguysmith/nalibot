@echo off
echo 🚀 Starting XRP Trading Bot - $125 to $200 Goal
echo ================================================
echo.

echo 📋 Quick Setup Instructions:
echo 1. Make sure you have $125 in your Kraken account
echo 2. Create API keys at: https://www.kraken.com/u/settings/api
echo 3. Edit the .env file with your API credentials
echo 4. Run this script to start trading
echo.

echo 🔧 Setting up environment...
if not exist .env (
    echo Creating .env file...
    copy config\production.env .env
    echo ⚠️  Please edit .env file with your Kraken API credentials
    pause
    exit
)

echo ✅ Environment ready
echo.

echo 🚀 Starting development server...
npm run dev

echo.
echo 📊 Dashboard will be available at: http://localhost:3000/production
echo 🎯 Goal: Turn $125 into $200 with XRP trading
echo.
echo Press any key to exit...
pause 