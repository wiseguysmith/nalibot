import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { BacktestResult } from '../services/backtestingEngine';
import { PerformanceMetrics, PerformanceAnalyzer } from '../services/performanceAnalyzer';

interface BacktestingDashboardProps {
  results?: BacktestResult[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const BacktestingDashboard: React.FC<BacktestingDashboardProps> = ({ results = [] }) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    if (results.length > 0) {
      const analyzer = new PerformanceAnalyzer();
      const metrics = results.map(result => analyzer.calculateMetrics(result));
      const comparisonResult = analyzer.compareStrategies(results);
      
      setPerformanceMetrics(metrics);
      setComparison(comparisonResult);
      setSelectedStrategy(results[0].strategy);
    }
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Backtesting Dashboard</h2>
        <p className="text-gray-600">No backtesting results available. Run a backtest to see performance metrics.</p>
      </div>
    );
  }

  const selectedResult = results.find(r => r.strategy === selectedStrategy);
  const selectedMetrics = performanceMetrics.find(m => m.strategy === selectedStrategy);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Backtesting Dashboard</h1>
        <p className="text-gray-600">Comprehensive analysis of trading strategy performance</p>
      </div>

      {/* Strategy Selector */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Strategy</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {results.map((result) => (
            <button
              key={result.strategy}
              onClick={() => setSelectedStrategy(result.strategy)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedStrategy === result.strategy
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">{result.strategy}</div>
              <div className="text-xs text-gray-500">
                {result.totalReturn.toFixed(1)}% return
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Return</h3>
          <p className="text-3xl font-bold text-green-600">
            {selectedMetrics?.totalReturn.toFixed(2)}%
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Sharpe Ratio</h3>
          <p className="text-3xl font-bold text-blue-600">
            {selectedMetrics?.sharpeRatio.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Win Rate</h3>
          <p className="text-3xl font-bold text-purple-600">
            {selectedMetrics?.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Max Drawdown</h3>
          <p className="text-3xl font-bold text-red-600">
            {selectedMetrics?.maxDrawdown.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Equity Curve - {selectedStrategy}</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={selectedResult?.dates.map((date, index) => ({
            date: new Date(date).toLocaleDateString(),
            equity: selectedResult?.equity[index] || 0
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Equity']} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="equity" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Strategy Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Returns Comparison */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Returns Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="strategy" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Return']} />
              <Bar dataKey="totalReturn" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Risk Metrics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="strategy" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Drawdown']} />
              <Bar dataKey="maxDrawdown" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Detailed Performance Metrics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sharpe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max DD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trades/Month</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceMetrics.map((metric) => (
                <tr key={metric.strategy} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.strategy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.totalReturn.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.sharpeRatio.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.winRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.maxDrawdown.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.tradesPerMonth.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      {comparison && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Strategy Analysis & Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Top Performers</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Return:</span>
                  <span className="font-medium">{comparison.bestPerformer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Most Consistent:</span>
                  <span className="font-medium">{comparison.mostConsistent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lowest Risk:</span>
                  <span className="font-medium">{comparison.lowestRisk}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Sharpe:</span>
                  <span className="font-medium">{comparison.highestSharpe}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Key Insights</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {comparison.recommendations.slice(0, 4).map((rec: string, index: number) => (
                  <div key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 