import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProgressChart from '../components/ProgressChart';
import AdvancedTradingDashboard from '../components/AdvancedTradingDashboard';

interface LivePerformance {
  totalBalance: number;
  totalPnL: number;
  dailyPnL: number;
  winRate: number;
  totalTrades: number;
  activeTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastUpdate: Date;
}

interface LiveTrade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: Date;
  strategy: string;
  status: string;
  profit?: number;
}

interface StrategyPerformance {
  name: string;
  allocation: number;
  currentValue: number;
  totalPnL: number;
  winRate: number;
  trades: number;
  status: string;
}

export default function AutoBreadDashboard() {
  const [performance, setPerformance] = useState<LivePerformance | null>(null);
  const [strategies, setStrategies] = useState<StrategyPerformance[]>([]);
  const [recentTrades, setRecentTrades] = useState<LiveTrade[]>([]);
  const [historicalData, setHistoricalData] = useState<{ balance: number; timestamp: Date }[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [automationLevel, setAutomationLevel] = useState('semi-automated');
  const [showAdvancedDashboard, setShowAdvancedDashboard] = useState(false);

  // Fetch real-time data
  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/trading/performance');
      const result = await response.json();
      
      if (result.success) {
        setPerformance(result.data.performance);
        setStrategies(result.data.strategies);
        setRecentTrades(result.data.recentTrades);
        setHistoricalData(result.data.historicalData || []);
        setIsActive(result.data.isActive);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  // OPERATOR INTERFACE: Removed execution controls
  // This is a read-only operator interface - no trading controls allowed

  // Auto-refresh data every 5 seconds
  useEffect(() => {
    fetchPerformanceData();
    
    const interval = setInterval(fetchPerformanceData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 relative overflow-hidden">
        {/* Animated Space Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse opacity-60"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-40"></div>
          <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce opacity-50"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="w-32 h-32 border-4 border-transparent border-t-cyan-400 border-r-blue-500 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-32 h-32 border-4 border-transparent border-b-purple-400 border-l-indigo-500 rounded-full animate-spin mx-auto" style={{animationDirection: 'reverse', animationDuration: '2s'}}></div>
            </div>
            <div className="mt-8 space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                AutoBread AI
              </h2>
              <p className="text-slate-300 text-lg">Initializing Neural Networks...</p>
              <div className="flex justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 relative overflow-hidden">
      {/* Animated Space Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-cyan-900/15 via-transparent to-transparent"></div>
        
        {/* Floating Stars */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-blue-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-indigo-400 rounded-full animate-pulse opacity-70"></div>
        <div className="absolute bottom-1/3 left-1/3 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-ping opacity-30"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">🤖</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-slate-900"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                    AutoBread
                  </h1>
                  <p className="text-slate-400 text-sm font-medium">AI-Powered Trading System</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-green-400 text-sm font-semibold tracking-wider">LIVE TRADING</span>
                <div className="w-px h-4 bg-slate-600"></div>
                <span className="text-slate-300 text-xs">v2.1.0</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAdvancedDashboard(!showAdvancedDashboard)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                  showAdvancedDashboard
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                }`}
              >
                {showAdvancedDashboard ? '📊 Basic View' : '🚀 Advanced View'}
              </button>
              <Link href="/strategies" className="px-6 py-3 bg-slate-800/50 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700/50 transition-all duration-300 border border-slate-700/50 hover:border-slate-600/50">
                ⚡ Strategies
              </Link>
              <Link href="/analytics" className="px-6 py-3 bg-slate-800/50 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700/50 transition-all duration-300 border border-slate-700/50 hover:border-slate-600/50">
                📈 Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showAdvancedDashboard ? (
          // Advanced Dashboard View
          <div className="space-y-8">
            <AdvancedTradingDashboard />
            
            {/* Quick Stats */}
            {performance && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      📊 Quick Stats
                    </h3>
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">⚡</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                        <span className="text-slate-300 font-medium">Sharpe Ratio</span>
                      </div>
                      <span className="text-white font-bold text-lg">{performance.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full"></div>
                        <span className="text-slate-300 font-medium">Active Trades</span>
                      </div>
                      <span className="text-white font-bold text-lg">{performance.activeTrades}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
                        <span className="text-slate-300 font-medium">Last Update</span>
                      </div>
                      <span className="text-white font-bold text-lg">{new Date(performance.lastUpdate).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Chart */}
                <div className="lg:col-span-2">
                  {historicalData.length > 0 && (
                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                          📈 Portfolio Performance
                        </h3>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">🚀</span>
                        </div>
                      </div>
                      <ProgressChart data={historicalData} width={800} height={400} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Trades */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                  🔄 Recent Trades
                </h3>
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">⚡</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-sm border-b border-slate-700/50">
                      <th className="pb-4 font-semibold">Pair</th>
                      <th className="pb-4 font-semibold">Type</th>
                      <th className="pb-4 font-semibold">Amount</th>
                      <th className="pb-4 font-semibold">Price</th>
                      <th className="pb-4 font-semibold">Profit</th>
                      <th className="pb-4 font-semibold">Strategy</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {recentTrades.slice(0, 5).map((trade, index) => (
                      <tr key={trade.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200">
                        <td className="py-4 font-medium">{trade.pair}</td>
                        <td className={`py-4 font-bold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.type === 'BUY' ? '📈 BUY' : '📉 SELL'}
                        </td>
                        <td className="py-4 font-medium">${trade.amount.toFixed(2)}</td>
                        <td className="py-4 font-medium">${trade.price.toFixed(2)}</td>
                        <td className={`py-4 font-bold ${trade.profit && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit ? `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-4 text-slate-300 font-medium">{trade.strategy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          // Basic Dashboard View
          <>
            {performance && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Balance Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-xl">💰</span>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-sm font-medium">Total Balance</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        ${performance.totalBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full"></div>
                </div>

                {/* Daily P&L Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl hover:shadow-green-500/10 transition-all duration-500 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-xl">📈</span>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-sm font-medium">Daily P&L</div>
                      <div className={`text-3xl font-bold ${performance.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {performance.dailyPnL >= 0 ? '+' : ''}{performance.dailyPnL.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className={`h-1 rounded-full ${performance.dailyPnL >= 0 ? 'bg-gradient-to-r from-green-400 to-emerald-600' : 'bg-gradient-to-r from-red-400 to-pink-600'}`}></div>
                </div>

                {/* Win Rate Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-sm font-medium">Win Rate</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        {(performance.winRate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full"></div>
                </div>

                {/* Max Drawdown Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl hover:shadow-orange-500/10 transition-all duration-500 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-xl">⚠️</span>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-sm font-medium">Max Drawdown</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                        {(performance.maxDrawdown * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-gradient-to-r from-orange-400 to-red-600 rounded-full"></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Automation Control */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
                    🤖 Automation Control
                  </h3>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">⚡</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-3">Automation Level</label>
                    <select
                      value={automationLevel}
                      onChange={(e) => setAutomationLevel(e.target.value)}
                      className="w-full bg-slate-800/50 text-white rounded-xl px-4 py-3 border border-slate-700/50 focus:border-blue-500 focus:outline-none backdrop-blur-sm"
                    >
                      <option value="fully-automated">🤖 Fully Automated</option>
                      <option value="semi-automated">👁️ Semi-Automated</option>
                      <option value="manual-approval">✋ Manual Approval</option>
                    </select>
                  </div>
                  {/* OPERATOR INTERFACE: Execution controls removed - read-only interface */}
                  <div className="w-full py-4 rounded-xl font-bold text-lg bg-slate-800/50 text-slate-400 border border-slate-700/50 text-center">
                    {isActive ? '🟢 Trading Active (Read-Only View)' : '🔴 Trading Stopped (Read-Only View)'}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              {performance && (
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                      📊 Quick Stats
                    </h3>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">⚡</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                        <span className="text-slate-300 font-medium">Sharpe Ratio</span>
                      </div>
                      <span className="text-white font-bold text-lg">{performance.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full"></div>
                        <span className="text-slate-300 font-medium">Active Trades</span>
                      </div>
                      <span className="text-white font-bold text-lg">{performance.activeTrades}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
                        <span className="text-slate-300 font-medium">Last Update</span>
                      </div>
                      <span className="text-white font-bold text-lg">{new Date(performance.lastUpdate).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Chart and Strategy Performance */}
              <div className="lg:col-span-2 space-y-8">
                {historicalData.length > 0 && (
                  <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        📈 Portfolio Performance
                      </h3>
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🚀</span>
                      </div>
                    </div>
                    <ProgressChart data={historicalData} width={800} height={400} />
                  </div>
                )}

                {/* Strategy Performance */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                      ⚡ Strategy Performance
                    </h3>
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">🎯</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {strategies.map((strategy) => (
                      <div key={strategy.name} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/30 hover:bg-slate-800/70 transition-all duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-white font-bold text-lg">{strategy.name}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${strategy.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                            {strategy.status}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                            <span className="text-slate-300 font-medium">P&L</span>
                            <span className={`font-bold text-lg ${strategy.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {strategy.totalPnL >= 0 ? '+' : ''}{strategy.totalPnL.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                            <span className="text-slate-300 font-medium">Win Rate</span>
                            <span className="text-white font-bold text-lg">{strategy.winRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                            <span className="text-slate-300 font-medium">Trades</span>
                            <span className="text-white font-bold text-lg">{strategy.trades}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Trades */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      🔄 Recent Trades
                    </h3>
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">⚡</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-slate-400 text-sm border-b border-slate-700/50">
                          <th className="pb-4 font-semibold">Pair</th>
                          <th className="pb-4 font-semibold">Type</th>
                          <th className="pb-4 font-semibold">Amount</th>
                          <th className="pb-4 font-semibold">Price</th>
                          <th className="pb-4 font-semibold">Profit</th>
                          <th className="pb-4 font-semibold">Strategy</th>
                        </tr>
                      </thead>
                      <tbody className="text-white">
                        {recentTrades.slice(0, 5).map((trade) => (
                          <tr key={trade.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200">
                            <td className="py-4 font-medium">{trade.pair}</td>
                            <td className={`py-4 font-bold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                              {trade.type === 'BUY' ? '📈 BUY' : '📉 SELL'}
                            </td>
                            <td className="py-4 font-medium">${trade.amount.toFixed(2)}</td>
                            <td className="py-4 font-medium">${trade.price.toFixed(2)}</td>
                            <td className={`py-4 font-bold ${trade.profit && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {trade.profit ? `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-4 text-slate-300 font-medium">{trade.strategy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}