import React, { useState, useEffect } from 'react';
import { StrategyScore, AllocationDecision } from '../services/metaStrategyAllocation';

interface AdvancedTradingDashboardProps {
  className?: string;
}

export default function AdvancedTradingDashboard({ className = '' }: AdvancedTradingDashboardProps) {
  const [performance, setPerformance] = useState<any>(null);
  const [strategyScores, setStrategyScores] = useState<StrategyScore[]>([]);
  const [allocationDecision, setAllocationDecision] = useState<AllocationDecision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch performance data
      const perfResponse = await fetch('/api/trading/performance');
      const perfData = await perfResponse.json();
      
      // Fetch allocation data
      const allocResponse = await fetch('/api/strategy/allocation');
      const allocData = await allocResponse.json();
      
      if (perfData.success) {
        setPerformance(perfData.data.performance);
      }
      
      if (allocData.success) {
        setStrategyScores(allocData.data.strategyScores || []);
        setAllocationDecision(allocData.data.allocationDecision || null);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };

  const getRiskColor = (value: number, thresholds: { low: number; medium: number; high: number }) => {
    if (value <= thresholds.low) return 'text-green-500';
    if (value <= thresholds.medium) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskLevel = (maxDrawdown: number) => {
    if (maxDrawdown < 0.05) return { level: 'Low', color: 'text-green-500', bg: 'bg-green-100' };
    if (maxDrawdown < 0.10) return { level: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-100' };
    if (maxDrawdown < 0.15) return { level: 'High', color: 'text-orange-500', bg: 'bg-orange-100' };
    return { level: 'Very High', color: 'text-red-500', bg: 'bg-red-100' };
  };

  if (isLoading) {
    return (
      <div className={`bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded-2xl mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-24 bg-slate-700 rounded-2xl"></div>
            <div className="h-24 bg-slate-700 rounded-2xl"></div>
            <div className="h-24 bg-slate-700 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="p-8 border-b border-slate-700/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              🚀 Advanced Trading Dashboard
            </h2>
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">⚡</span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'risk'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
              }`}
            >
              ⚠️ Risk Analysis
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'allocation'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Strategy Allocation
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Total Return</div>
                <div className={`text-2xl font-bold ${performance?.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {performance?.totalPnL >= 0 ? '+' : ''}{performance?.totalPnL?.toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Sharpe Ratio</div>
                <div className={`text-2xl font-bold ${getRiskColor(performance?.sharpeRatio || 0, { low: 1.5, medium: 1.0, high: 0.5 })}`}>
                  {performance?.sharpeRatio?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Win Rate</div>
                <div className="text-2xl font-bold text-white">
                  {(performance?.winRate * 100)?.toFixed(1) || '0.0'}%
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Max Drawdown</div>
                <div className={`text-2xl font-bold ${getRiskColor(performance?.maxDrawdown || 0, { low: 0.05, medium: 0.10, high: 0.15 })}`}>
                  {(performance?.maxDrawdown * 100)?.toFixed(1) || '0.0'}%
                </div>
              </div>
            </div>

            {/* Risk Level Indicator */}
            {performance && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-400 text-sm">Risk Level</div>
                    <div className={`text-xl font-bold ${getRiskLevel(performance.maxDrawdown).color}`}>
                      {getRiskLevel(performance.maxDrawdown).level}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${getRiskLevel(performance.maxDrawdown).bg}`}>
                    <div className={`text-sm font-medium ${getRiskLevel(performance.maxDrawdown).color}`}>
                      Risk Assessment
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* Risk Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Risk Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Value at Risk (95%)</span>
                    <span className="text-white font-medium">-2.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expected Shortfall</span>
                    <span className="text-white font-medium">-3.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volatility</span>
                    <span className="text-white font-medium">12.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Beta</span>
                    <span className="text-white font-medium">0.85</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Risk Controls</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily Loss Limit</span>
                    <span className="text-green-500 font-medium">5.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Drawdown Limit</span>
                    <span className="text-green-500 font-medium">10.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Position Size Limit</span>
                    <span className="text-green-500 font-medium">2.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Risk Per Trade</span>
                    <span className="text-green-500 font-medium">1.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Warnings */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Risk Warnings</h3>
              <ul className="space-y-1 text-red-300">
                <li>• Current drawdown approaching limit (8.2% / 10.0%)</li>
                <li>• Volatility above normal range (12.5% vs 8.0% avg)</li>
                <li>• Consider reducing position sizes in current market conditions</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {/* Strategy Scores */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Strategy Performance Scores</h3>
              <div className="space-y-3">
                {strategyScores.map((score, index) => (
                  <div key={score.name} className="flex items-center justify-between p-3 bg-gray-600/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-500 text-black' : 'bg-gray-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{score.name}</div>
                        <div className="text-gray-400 text-sm">
                          Sharpe: {score.sharpeRatio.toFixed(2)} | Win Rate: {(score.winRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{score.recommendedAllocation.toFixed(1)}%</div>
                      <div className="text-gray-400 text-sm">Score: {score.compositeScore.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation Decision */}
            {allocationDecision && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Latest Allocation Decision</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date</span>
                    <span className="text-white">{new Date(allocationDecision.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market Regime</span>
                    <span className="text-white capitalize">{allocationDecision.marketRegime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Confidence</span>
                    <span className="text-white">{(allocationDecision.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="text-blue-300 text-sm">{allocationDecision.reason}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 