import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/trading/performance');
      const result = await response.json();
      
      if (result.success) {
        setPerformance(result.data.performance);
        setAnalytics(result.data.analytics);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-white mt-4">Loading Analytics...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
                <p className="text-gray-400 text-sm">Real-time trading metrics and insights</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Performance Metrics */}
        {performance && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm">Total Return</h3>
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-400 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📈</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {((performance.totalBalance - 1000) / 1000 * 100).toFixed(2)}%
              </div>
              <div className="text-gray-400 text-sm">
                ${performance.totalBalance.toFixed(2)} total
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm">Sharpe Ratio</h3>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">⚡</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{performance.sharpeRatio.toFixed(2)}</div>
              <div className="text-gray-400 text-sm">Risk-adjusted return</div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm">Max Drawdown</h3>
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-400 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📉</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{performance.maxDrawdown.toFixed(2)}%</div>
              <div className="text-gray-400 text-sm">Peak to trough</div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm">Win Rate</h3>
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-400 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🎯</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{performance.winRate.toFixed(1)}%</div>
              <div className="text-gray-400 text-sm">{performance.totalTrades} trades</div>
            </div>
          </div>
        )}

        {/* Detailed Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trade Statistics */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Trade Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Trades</span>
                  <span className="text-white font-medium">{analytics.totalTrades}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Winning Trades</span>
                  <span className="text-green-400 font-medium">{analytics.winningTrades}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Losing Trades</span>
                  <span className="text-red-400 font-medium">{analytics.losingTrades}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-white font-medium">{analytics.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Profit Factor</span>
                  <span className="text-white font-medium">{analytics.profitFactor.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Profit/Loss Analysis */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Profit/Loss Analysis</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Profit</span>
                  <span className="text-green-400 font-medium">${analytics.totalProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Loss</span>
                  <span className="text-red-400 font-medium">${analytics.totalLoss.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Average Win</span>
                  <span className="text-green-400 font-medium">${analytics.averageWin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Average Loss</span>
                  <span className="text-red-400 font-medium">${analytics.averageLoss.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Largest Win</span>
                  <span className="text-green-400 font-medium">${analytics.largestWin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Largest Loss</span>
                  <span className="text-red-400 font-medium">${analytics.largestLoss.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Streak Analysis */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Streak Analysis</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Longest Win Streak</span>
                  <span className="text-green-400 font-medium">{analytics.consecutiveWins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Longest Loss Streak</span>
                  <span className="text-red-400 font-medium">{analytics.consecutiveLosses}</span>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Performance Insights</h3>
              
              <div className="space-y-4">
                {analytics.winRate >= 60 ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400">Excellent win rate above 60%</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-400">Win rate needs improvement</span>
                  </div>
                )}

                {analytics.profitFactor >= 1.5 ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400">Strong profit factor above 1.5</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-400">Profit factor needs improvement</span>
                  </div>
                )}

                {performance && performance.maxDrawdown <= 10 ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400">Good risk management (drawdown ≤ 10%)</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-red-400">High drawdown - review risk management</span>
                  </div>
                )}

                {performance && performance.sharpeRatio >= 1 ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400">Good risk-adjusted returns (Sharpe ≥ 1)</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-400">Risk-adjusted returns need improvement</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Performance Summary */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-6">Performance Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {performance ? ((performance.totalBalance - 1000) / 1000 * 100).toFixed(2) : '0.00'}%
              </div>
              <div className="text-gray-400">Total Return</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {performance ? performance.totalTrades : 0}
              </div>
              <div className="text-gray-400">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {performance ? performance.winRate.toFixed(1) : '0.0'}%
              </div>
              <div className="text-gray-400">Win Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 