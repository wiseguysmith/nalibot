import React, { useState, useEffect } from 'react';
import { User, SubscriptionTier } from '../services/authService';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'trading', label: 'Trading', icon: '📈' },
    { id: 'strategies', label: 'Strategies', icon: '🤖' },
    { id: 'analytics', label: 'Analytics', icon: '📋' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const quickStats = [
    {
      label: 'Total Return',
      value: `${user.performance.totalReturn > 0 ? '+' : ''}${user.performance.totalReturn.toFixed(2)}%`,
      change: '+12.5%',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Win Rate',
      value: `${user.performance.winRate.toFixed(1)}%`,
      change: '+2.1%',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Active Strategies',
      value: user.strategies.filter(s => s.isActive).length.toString(),
      change: '2 new',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Portfolio Value',
      value: '$12,450',
      change: '+$1,230',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  const recentTrades = [
    { id: 1, pair: 'BTC/USD', type: 'BUY', amount: '$500', profit: '+$45', time: '2 min ago', status: 'success' },
    { id: 2, pair: 'ETH/USD', type: 'SELL', amount: '$300', profit: '-$12', time: '15 min ago', status: 'loss' },
    { id: 3, pair: 'SOL/USD', type: 'BUY', amount: '$200', profit: '+$28', time: '1 hour ago', status: 'success' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TB</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">TradeBot Pro</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Subscription Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                user.subscription.name === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                user.subscription.name === 'pro' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {user.subscription.name.toUpperCase()}
              </div>
              
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-700 font-medium">{user.name}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className={`${stat.bgColor} p-6 rounded-lg border border-gray-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`text-sm font-medium ${stat.color}`}>
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Performance Overview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Sharpe Ratio</p>
                      <p className="text-xl font-semibold text-gray-900">{user.performance.sharpeRatio}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Max Drawdown</p>
                      <p className="text-xl font-semibold text-gray-900">{user.performance.maxDrawdown}%</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Profit Factor</p>
                      <p className="text-xl font-semibold text-gray-900">{user.performance.profitFactor}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Trades */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Loss</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentTrades.map((trade) => (
                          <tr key={trade.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {trade.pair}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.amount}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              trade.status === 'success' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {trade.profit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trade.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Active Strategies */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Strategies</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.strategies.filter(s => s.isActive).map((strategy) => (
                      <div key={strategy.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{strategy.name}</h4>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Win Rate</p>
                            <p className="font-semibold text-gray-900">{strategy.performance.winRate}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Trades</p>
                            <p className="font-semibold text-gray-900">{strategy.performance.totalTrades}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">P&L</p>
                            <p className={`font-semibold ${strategy.performance.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${strategy.performance.profitLoss}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Sharpe</p>
                            <p className="font-semibold text-gray-900">{strategy.performance.sharpeRatio}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trading' && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📈</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Trading Dashboard</h3>
                <p className="text-gray-600">Advanced trading features coming soon...</p>
              </div>
            )}

            {activeTab === 'strategies' && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Strategy Management</h3>
                <p className="text-gray-600">Strategy builder and management tools coming soon...</p>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
                <p className="text-gray-600">Comprehensive analytics and reporting coming soon...</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
                <p className="text-gray-600">Account and system settings coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 