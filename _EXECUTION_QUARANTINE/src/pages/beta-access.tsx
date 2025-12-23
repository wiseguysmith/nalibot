import React, { useState } from 'react';
import Link from 'next/link';

export default function BetaAccessPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telegram: '',
    investment: '1000',
    automation: 'semi-automated'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle beta access submission
    console.log('Beta access request:', formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
                <h1 className="text-3xl font-bold text-white">AutoBread</h1>
                <p className="text-gray-400 text-sm">AI-Powered Trading Platform</p>
              </div>
            </div>
            <Link href="/" className="text-gray-300 hover:text-white font-medium transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              Exclusive Beta Access
            </div>
          </div>
          
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
            Join the <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">AutoBread</span> Beta
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Be among the first to experience the future of automated trading. 
            Limited spots available for our exclusive beta program.
          </p>
          
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-8 border border-blue-500/20 mb-12">
            <div className="text-4xl font-bold text-white mb-2">$333/month</div>
            <div className="text-gray-400 mb-4">Exclusive Beta Pricing</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">20%</div>
                <div className="text-gray-400">Monthly Return Target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">10%</div>
                <div className="text-gray-400">Max Drawdown</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">24/7</div>
                <div className="text-gray-400">Trading</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Beta Features */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-8">Beta Program Benefits</h3>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">🚀</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Early Access</h4>
                  <p className="text-gray-400 text-sm">Be among the first to test our advanced AI trading algorithms and provide feedback.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">💬</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Direct Support</h4>
                  <p className="text-gray-400 text-sm">Direct access to our development team via Telegram for questions and support.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">⚡</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Priority Features</h4>
                  <p className="text-gray-400 text-sm">Access to new features and strategies before they're released to the public.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Performance Insights</h4>
                  <p className="text-gray-400 text-sm">Detailed analytics and performance reports to track your trading success.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">🛡️</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Risk Management</h4>
                  <p className="text-gray-400 text-sm">Advanced risk controls with 10% maximum drawdown protection.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Application Form */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Apply for Beta Access</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Telegram Username
                </label>
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="@username"
                  required
                />
                <p className="text-gray-400 text-xs mt-1">For notifications and support</p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Initial Investment
                </label>
                <select
                  name="investment"
                  value={formData.investment}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="1000">$1,000</option>
                  <option value="2500">$2,500</option>
                  <option value="5000">$5,000</option>
                  <option value="10000">$10,000</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Preferred Automation Level
                </label>
                <select
                  name="automation"
                  value={formData.automation}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="fully-automated">Fully Automated</option>
                  <option value="semi-automated">Semi-Automated</option>
                  <option value="manual-approval">Manual Approval</option>
                  <option value="monitoring-only">Monitoring Only</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-cyan-500 transition-all transform hover:scale-105"
              >
                Apply for Beta Access
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm text-center">
                By applying, you agree to our{' '}
                <Link href="/terms" className="text-blue-400 hover:text-blue-300">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800/30 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">How long is the beta program?</h4>
              <p className="text-gray-400 text-sm">The beta program will run for 3 months, after which we'll transition to our full launch pricing.</p>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">What's included in the $333/month?</h4>
              <p className="text-gray-400 text-sm">Full access to all trading strategies, real-time notifications, direct support, and advanced analytics.</p>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">Can I change my automation level?</h4>
              <p className="text-gray-400 text-sm">Yes, you can adjust your automation level at any time through the dashboard settings.</p>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">What exchanges do you support?</h4>
              <p className="text-gray-400 text-sm">Currently supporting Kraken and Binance, with more exchanges coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 