import React, { useState, useEffect } from 'react';
import { ProductionPerformance, ProductionTrade } from '../services/productionTradingEngine';

interface ProductionDashboardProps {
  className?: string;
}

export default function ProductionDashboard({ className = '' }: ProductionDashboardProps) {
  const [performance, setPerformance] = useState<ProductionPerformance | null>(null);
  const [recentTrades, setRecentTrades] = useState<ProductionTrade[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  const fetchProductionData = async () => {
    try {
      const response = await fetch('/api/trading/production');
      const result = await response.json();
      
      if (result.success) {
        setPerformance(result.data.performance);
        setRecentTrades(result.data.recentTrades);
        setIsActive(result.data.isActive);
        setBalance(result.data.balance);
        setConfig(result.data.config);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch production data');
      }
    } catch (error) {
      setError('Network error - cannot connect to production engine');
    } finally {
      setIsLoading(false);
    }
  };

  // OPERATOR INTERFACE: Removed execution controls
  // This is a read-only operator interface - no trading controls allowed

  useEffect(() => {
    fetchProductionData();
    const interval = setInterval(fetchProductionData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-500';
      case 'MODERATE': return 'text-yellow-500';
      case 'HIGH': return 'text-orange-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-500';
    if (progress >= 75) return 'text-blue-500';
    if (progress >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-white mt-4 text-xl">Loading Production Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-2xl mb-4">Production Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={fetchProductionData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 ${className}`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🚀 Production Trading</h1>
            <p className="text-gray-300">Live trading with real Kraken API - Dynamic XRP Goal</p>
          </div>
          {/* OPERATOR INTERFACE: Execution controls removed - read-only interface */}
          <div className="flex space-x-4">
            <div className="bg-slate-700/50 text-slate-300 px-6 py-3 rounded-lg font-semibold border border-slate-600">
              {isActive ? '🟢 Trading Active (Read-Only)' : '🔴 Trading Stopped (Read-Only)'}
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`p-4 rounded-lg mb-6 ${isActive ? 'bg-green-900/20 border border-green-500' : 'bg-gray-800 border border-gray-600'}`}>
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-3 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-white font-semibold">
              {isActive ? '🟢 LIVE TRADING ACTIVE' : '🔴 TRADING STOPPED'}
            </span>
          </div>
        </div>

        {/* Main Performance Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Balance & P&L */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">💰 Balance & P&L</h3>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400">Current Balance</p>
                <p className="text-2xl font-bold text-white">${balance.toFixed(2)}</p>
              </div>
              {performance && (
                <>
                  <div>
                    <p className="text-gray-400">Total P&L</p>
                    <p className={`text-xl font-semibold ${performance.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {performance.totalPnL >= 0 ? '+' : ''}${performance.totalPnL.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Daily P&L</p>
                    <p className={`text-lg ${performance.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {performance.dailyPnL >= 0 ? '+' : ''}{performance.dailyPnL.toFixed(2)}%
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Target Progress */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">🎯 Target Progress</h3>
            {performance && (
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400">Progress to Dynamic Goal</p>
                  <p className={`text-2xl font-bold ${getProgressColor(performance.targetProgress)}`}>
                    {performance.targetProgress.toFixed(1)}%
                  </p>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(performance.targetProgress, 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-400">
                  ${performance.totalPnL.toFixed(2)} / ${(performance.totalBalance * 0.6).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Risk Metrics */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">🛡️ Risk Metrics</h3>
            {performance && (
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400">Risk Level</p>
                  <p className={`text-lg font-semibold ${getRiskColor(performance.riskLevel)}`}>
                    {performance.riskLevel}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Max Drawdown</p>
                  <p className="text-lg text-white">{performance.maxDrawdown.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Sharpe Ratio</p>
                  <p className="text-lg text-white">{performance.sharpeRatio.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* XRP Balance Information */}
        {performance && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">🪙 XRP Balance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-400">XRP Amount</p>
                <p className="text-2xl font-bold text-blue-400">
                  {performance.xrpData?.xrpAmount?.toFixed(2) || '0.00'} XRP
                </p>
              </div>
              <div>
                <p className="text-gray-400">XRP Value (USD)</p>
                <p className="text-2xl font-bold text-green-400">
                  ${performance.xrpData?.xrpValue?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">USD Balance</p>
                <p className="text-2xl font-bold text-yellow-400">
                  ${performance.xrpData?.usdBalance?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
              <p className="text-blue-300 text-sm">
                💡 <strong>Live Data:</strong> This shows your actual Kraken account balance. 
                XRP amount and USD values are updated in real-time from your Kraken account.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Goal Information */}
        {performance && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">🎯 Dynamic Trading Goal</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-400">Current Balance</p>
                <p className="text-2xl font-bold text-white">
                  ${performance.totalBalance.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Target Goal (60% Profit)</p>
                <p className="text-2xl font-bold text-green-400">
                  ${(performance.totalBalance * 1.6).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Profit Needed</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${(performance.totalBalance * 0.6).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-900/20 border border-green-500 rounded-lg">
              <p className="text-green-300 text-sm">
                🎯 <strong>Smart Goal:</strong> The system automatically adjusts your profit target based on your actual available balance. 
                With ${performance.totalBalance.toFixed(2)}, your goal is ${(performance.totalBalance * 1.6).toFixed(2)} (60% profit).
              </p>
            </div>
          </div>
        )}

        {/* Trading Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trading Stats */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">📊 Trading Statistics</h3>
            {performance && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{performance.totalTrades}</p>
                </div>
                <div>
                  <p className="text-gray-400">Win Rate</p>
                  <p className="text-2xl font-bold text-green-500">{performance.winRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Active Trades</p>
                  <p className="text-2xl font-bold text-blue-500">{performance.activeTrades}</p>
                </div>
                <div>
                  <p className="text-gray-400">Last Update</p>
                  <p className="text-sm text-gray-300">
                    {new Date(performance.lastUpdate).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">⚙️ Configuration</h3>
            {config && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Initial Balance:</span>
                  <span className="text-white">${config.initialBalance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Profit:</span>
                  <span className="text-white">${config.targetProfit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Drawdown:</span>
                  <span className="text-white">{config.maxDrawdownPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk per Trade:</span>
                  <span className="text-white">{config.riskPerTradePercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Position Size:</span>
                  <span className="text-white">{config.positionSizePercentage}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">🔄 Recent Trades</h3>
          {recentTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Pair</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Price</th>
                    <th className="text-left py-2">Strategy</th>
                    <th className="text-left py-2">Profit</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-700">
                      <td className="py-2 text-gray-300">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 text-white font-mono">{trade.pair}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.type === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-2 text-white">${trade.amount.toFixed(2)}</td>
                      <td className="py-2 text-white">${trade.price.toFixed(2)}</td>
                      <td className="py-2 text-gray-300">{trade.strategy}</td>
                      <td className="py-2">
                        {trade.profit !== undefined ? (
                          <span className={trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.status === 'executed' ? 'bg-green-900 text-green-300' :
                          trade.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {trade.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No trades yet</p>
          )}
        </div>

        {/* Safety Warning */}
        <div className="mt-8 p-4 bg-red-900/20 border border-red-500 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-500 text-2xl mr-3">⚠️</div>
            <div>
              <h4 className="text-red-400 font-semibold">Production Trading Warning</h4>
              <p className="text-red-300 text-sm">
                This is live trading with real money. Monitor carefully and use emergency stop if needed. 
                Only trade with funds you can afford to lose.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 