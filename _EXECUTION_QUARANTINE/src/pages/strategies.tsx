import React, { useState } from 'react';
import Link from 'next/link';
import StrategyTemplates from '../components/StrategyTemplates';
import SafetyMode from '../components/SafetyMode';
import TradeExplanation from '../components/TradeExplanation';

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: {
    min: number;
    max: number;
    average: number;
  };
  maxDrawdown: number;
  timeHorizon: string;
  allocation: {
    meanReversion: number;
    arbitrage: number;
    gridTrading: number;
    mlPrediction: number;
  };
  features: string[];
  color: string;
  icon: string;
}

interface SafetySettings {
  maxDailyTrades: number;
  stopTradingOnLoss: boolean;
  maxLossPercentage: number;
  notifyBeforeVolatility: boolean;
  volatilityThreshold: number;
  emergencyStop: boolean;
  autoRebalance: boolean;
  maxPositionSize: number;
}

export default function StrategiesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('breadbot-balanced');
  const [safetySettings, setSafetySettings] = useState<SafetySettings>({
    maxDailyTrades: 20,
    stopTradingOnLoss: true,
    maxLossPercentage: 10,
    notifyBeforeVolatility: true,
    volatilityThreshold: 25,
    emergencyStop: false,
    autoRebalance: true,
    maxPositionSize: 5
  });

  const [currentRisk, setCurrentRisk] = useState(45);
  const [dailyStats, setDailyStats] = useState({
    trades: 8,
    profit: 125.50,
    loss: 45.20,
    drawdown: 3.2
  });

  // Mock trade for demonstration
  const mockTrade = {
    id: 'trade_123456',
    symbol: 'BTC/USD',
    type: 'BUY' as const,
    amount: 0.05,
    price: 45000,
    timestamp: new Date(),
    strategy: 'Mean Reversion',
    reason: 'RSI oversold (28.5) and price below lower Bollinger Band',
    profit: 125.50,
    stopLoss: 43000,
    takeProfit: 47000
  };

  const handleTemplateSelect = (template: StrategyTemplate) => {
    setSelectedTemplate(template.id);
    
    // Update risk level based on template
    const riskMap = { low: 25, medium: 45, high: 75 };
    setCurrentRisk(riskMap[template.riskLevel]);
    
    // Update safety settings based on template
    const newSettings = { ...safetySettings };
    if (template.riskLevel === 'low') {
      newSettings.maxDailyTrades = 15;
      newSettings.maxLossPercentage = 5;
      newSettings.maxPositionSize = 3;
    } else if (template.riskLevel === 'high') {
      newSettings.maxDailyTrades = 30;
      newSettings.maxLossPercentage = 15;
      newSettings.maxPositionSize = 8;
    }
    setSafetySettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold text-xl">AB</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AutoBread Strategies</h1>
                <p className="text-gray-400 text-sm">Configure your trading strategy and safety settings</p>
              </div>
            </div>
            
            <nav className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-300 hover:text-white font-medium transition-colors">
                Dashboard
              </Link>
              <Link href="/analytics" className="text-gray-300 hover:text-white font-medium transition-colors">
                Analytics
              </Link>
              <Link href="/" className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-500 transition-all">
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Strategy Templates */}
          <div className="lg:col-span-2">
            <StrategyTemplates 
              onSelectTemplate={handleTemplateSelect}
              selectedTemplate={selectedTemplate}
            />
            
            {/* Daily Digest Section */}
            <div className="mt-8 bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">📧 Daily Digest Email</h3>
              <p className="text-gray-400 mb-6">
                Get a comprehensive daily summary of your trading performance, market insights, and strategy recommendations.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">📊 What's Included</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Daily P&L and portfolio summary</li>
                    <li>• Top performing strategy analysis</li>
                    <li>• Recent trades breakdown</li>
                    <li>• Market sentiment and outlook</li>
                    <li>• AI-powered insights and recommendations</li>
                    <li>• Risk metrics and safety alerts</li>
                  </ul>
                </div>
                
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">⚙️ Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Daily Digest</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Send Time</span>
                      <select className="bg-gray-600 text-white text-sm rounded px-2 py-1">
                        <option>6:00 PM</option>
                        <option>7:00 PM</option>
                        <option>8:00 PM</option>
                        <option>9:00 PM</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Timezone</span>
                      <select className="bg-gray-600 text-white text-sm rounded px-2 py-1">
                        <option>America/New_York</option>
                        <option>America/Los_Angeles</option>
                        <option>Europe/London</option>
                        <option>Asia/Tokyo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex space-x-4">
                <button className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all">
                  📧 Test Daily Digest
                </button>
                <button className="bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all">
                  ⚙️ Configure Email
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar - Safety Mode & Trade Explanation */}
          <div className="space-y-6">
            {/* Safety Mode */}
            <SafetyMode
              settings={safetySettings}
              onSettingsChange={setSafetySettings}
              currentRisk={currentRisk}
              dailyStats={dailyStats}
            />

            {/* Trade Explanation Demo */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">📊 Trade Explanation Demo</h3>
              <p className="text-gray-400 text-sm mb-4">
                See how AutoBread explains each trade in plain English
              </p>
              <TradeExplanation trade={mockTrade} isExpanded={true} />
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">⚡ Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-green-500 to-emerald-400 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-500 transition-all">
                  🚀 Start Trading
                </button>
                <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all">
                  🧪 Run Backtest
                </button>
                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-400 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-500 transition-all">
                  🔧 Optimize Strategy
                </button>
              </div>
            </div>

            {/* Strategy Stats */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">📈 Strategy Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Return</span>
                  <span className="text-green-400 font-medium">+18.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sharpe Ratio</span>
                  <span className="text-white font-medium">1.85</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Drawdown</span>
                  <span className="text-red-400 font-medium">-8.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-white font-medium">67.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Trades</span>
                  <span className="text-white font-medium">156</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Strategy Optimizer */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-4">🤖 Strategy Optimizer</h3>
          <p className="text-gray-400 mb-6">
            Let AutoBread automatically find the best parameters for your strategy using advanced backtesting.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">🔍 Parameter Sweep</h4>
              <p className="text-gray-300 text-sm">Tests hundreds of parameter combinations to find optimal settings</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">📊 Performance Ranking</h4>
              <p className="text-gray-300 text-sm">Ranks strategies by Sharpe ratio, returns, and risk metrics</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">💾 Save Presets</h4>
              <p className="text-gray-300 text-sm">Automatically saves top 3 configurations as reusable presets</p>
            </div>
          </div>

          <div className="mt-6 flex space-x-4">
            <button className="bg-gradient-to-r from-purple-500 to-pink-400 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-500 transition-all">
              🚀 Run Optimization
            </button>
            <button className="bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all">
              📋 View Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 