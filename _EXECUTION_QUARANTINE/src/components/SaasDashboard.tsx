import React, { useState, useEffect } from 'react';
import { authService, SubscriptionTier } from '../services/authService';

interface SaasDashboardProps {
  user?: any;
  onLogin?: () => void;
  onRegister?: () => void;
}

export const SaasDashboard: React.FC<SaasDashboardProps> = ({ user, onLogin, onRegister }) => {
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSubscriptionTiers();
  }, []);

  const fetchSubscriptionTiers = async () => {
    try {
      const response = await fetch('/api/subscription/tiers');
      const data = await response.json();
      if (data.success) {
        setSubscriptionTiers(data.tiers);
      }
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
    }
  };

  const features = [
    {
      title: 'AI-Powered Trading',
      description: 'Advanced machine learning algorithms for market prediction',
      icon: '🤖',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Multiple Strategies',
      description: 'Trend following, arbitrage, mean reversion, and more',
      icon: '📈',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Risk Management',
      description: 'Professional-grade risk controls and monitoring',
      icon: '🛡️',
      color: 'bg-red-100 text-red-600'
    },
    {
      title: 'Real-time Analytics',
      description: 'Live performance tracking and detailed insights',
      icon: '📊',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Multi-Exchange Support',
      description: 'Trade across multiple exchanges simultaneously',
      icon: '🌐',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      title: '24/7 Automation',
      description: 'Never miss a trading opportunity',
      icon: '⚡',
      color: 'bg-indigo-100 text-indigo-600'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '2,847', change: '+12%' },
    { label: 'Total Trades', value: '1.2M', change: '+8%' },
    { label: 'Success Rate', value: '73%', change: '+5%' },
    { label: 'Monthly Revenue', value: '$45K', change: '+15%' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">TB</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TradeBot Pro</h1>
                <p className="text-sm text-gray-600">Professional Trading Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">Welcome, {user.name}</span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    user.subscription.name === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                    user.subscription.name === 'pro' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.subscription.name.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <button
                    onClick={onLogin}
                    className="text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={onRegister}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'pricing', label: 'Pricing', icon: '💰' },
                { id: 'analytics', label: 'Analytics', icon: '📈' },
                { id: 'community', label: 'Community', icon: '👥' }
              ].map((tab) => (
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
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Professional Trading Platform
                  </h2>
                  <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                    Advanced AI-powered trading with real market data, comprehensive analytics, 
                    and professional risk management tools.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={onRegister}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Start Free Trial
                    </button>
                    <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                      View Demo
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                      <div className="text-xs text-green-600 font-medium">{stat.change}</div>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                          <span className="text-2xl">{feature.icon}</span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                        <p className="text-gray-600 text-sm">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Choose Your Plan</h3>
                  <p className="text-gray-600">Start with a free trial, upgrade when you're ready</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {subscriptionTiers.map((tier) => (
                    <div key={tier.id} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-center mb-6">
                        <h4 className="text-xl font-semibold text-gray-900 mb-2">{tier.name}</h4>
                        <div className="text-3xl font-bold text-gray-900">${tier.price}</div>
                        <div className="text-sm text-gray-600">per month</div>
                      </div>
                      
                      <ul className="space-y-3 mb-6">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Get Started
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📈</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Platform Analytics</h3>
                <p className="text-gray-600">Detailed platform performance and user analytics coming soon...</p>
              </div>
            )}

            {activeTab === 'community' && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Community</h3>
                <p className="text-gray-600">Join our community of traders and developers...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 