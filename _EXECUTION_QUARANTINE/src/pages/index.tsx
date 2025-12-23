import React from 'react';
import Link from 'next/link';

export default function AutoBreadHomePage() {
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
      <header className="relative z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-xl">🤖</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-slate-900"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">AutoBread</h1>
                <p className="text-slate-400 text-sm font-medium">AI-Powered Trading System</p>
              </div>
            </div>
            <nav className="flex space-x-6">
              <Link href="/dashboard" className="text-slate-300 hover:text-cyan-400 font-semibold transition-all duration-300 hover:scale-105">
                🚀 Dashboard
              </Link>
              <Link href="/strategies" className="text-slate-300 hover:text-cyan-400 font-semibold transition-all duration-300 hover:scale-105">
                ⚡ Strategies
              </Link>
              <Link href="/analytics" className="text-slate-300 hover:text-cyan-400 font-semibold transition-all duration-300 hover:scale-105">
                📈 Analytics
              </Link>
              <Link href="/beta-access" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/25">
                🎯 Beta Access
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
              Beta Access Now Available
            </div>
          </div>
          
          <h2 className="text-6xl font-bold text-white mb-6 leading-tight">
            The Future of
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Automated Trading</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            AutoBread combines advanced AI, multi-strategy algorithms, and real-time market analysis 
            to deliver consistent 20% monthly returns with intelligent risk management.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link 
              href="/beta-access"
              className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-cyan-500 transition-all transform hover:scale-105"
            >
              Join Beta - $333/month
            </Link>
            <Link 
              href="/demo"
              className="border border-gray-600 text-gray-300 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 hover:border-gray-500 transition-all"
            >
              View Demo
            </Link>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-20">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">20%</div>
              <div className="text-gray-400">Monthly Return Target</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">10%</div>
              <div className="text-gray-400">Max Drawdown</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Trading</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">4</div>
              <div className="text-gray-400">Strategy Types</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">AI-Powered Strategies</h3>
            <p className="text-gray-400 leading-relaxed">
              Advanced machine learning algorithms that adapt to market conditions in real-time, 
              optimizing for maximum returns while managing risk.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-400 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Multi-Strategy Portfolio</h3>
            <p className="text-gray-400 leading-relaxed">
              Mean reversion, arbitrage, grid trading, and momentum strategies working together 
              to capture opportunities across all market conditions.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-400 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Multi-Tier Automation</h3>
            <p className="text-gray-400 leading-relaxed">
              Choose your comfort level: fully automated, semi-automated with approvals, 
              or manual control with real-time monitoring and alerts.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-400 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white text-2xl">🛡️</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Intelligent Risk Management</h3>
            <p className="text-gray-400 leading-relaxed">
              Dynamic position sizing, real-time portfolio monitoring, and automatic 
              stop-loss systems to protect your capital.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-400 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Real-Time Notifications</h3>
            <p className="text-gray-400 leading-relaxed">
              Instant alerts via Telegram and WhatsApp for trades, performance updates, 
              and important market events.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-400 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white text-2xl">📈</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Advanced Analytics</h3>
            <p className="text-gray-400 leading-relaxed">
              Comprehensive performance tracking, portfolio heat maps, and detailed 
              analytics to understand your trading success.
            </p>
          </div>
        </div>

        {/* Automation Tiers */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-white text-center mb-12">Choose Your Automation Level</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700 text-center">
              <div className="text-2xl mb-4">🤖</div>
              <h4 className="text-lg font-semibold text-white mb-2">Fully Automated</h4>
              <p className="text-gray-400 text-sm">Set and forget. AI handles everything.</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700 text-center">
              <div className="text-2xl mb-4">👁️</div>
              <h4 className="text-lg font-semibold text-white mb-2">Semi-Automated</h4>
              <p className="text-gray-400 text-sm">AI suggests, you approve.</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700 text-center">
              <div className="text-2xl mb-4">✋</div>
              <h4 className="text-lg font-semibold text-white mb-2">Manual Approval</h4>
              <p className="text-gray-400 text-sm">Review every trade before execution.</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700 text-center">
              <div className="text-2xl mb-4">📊</div>
              <h4 className="text-lg font-semibold text-white mb-2">Monitoring Only</h4>
              <p className="text-gray-400 text-sm">Real-time alerts and insights.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-12 text-center border border-blue-500/20">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Start Your Trading Journey?</h3>
          <p className="text-gray-400 mb-8 text-lg">
            Join the exclusive AutoBread beta and experience the future of automated trading.
          </p>
          <Link 
            href="/beta-access"
            className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-cyan-500 transition-all transform hover:scale-105 inline-block"
          >
            Get Beta Access - $333/month
          </Link>
        </div>
      </div>
    </div>
  );
} 