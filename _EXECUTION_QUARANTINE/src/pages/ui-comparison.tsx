import React from 'react';

export default function UIComparisonPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UI/UX Changes</h1>
              <p className="text-gray-600 mt-1">See what improved in the interface</p>
            </div>
            <div className="flex space-x-4">
              <a href="/demo" className="text-blue-600 hover:text-blue-800 font-medium">
                Demo →
              </a>
              <a href="/saas" className="text-blue-600 hover:text-blue-800 font-medium">
                SaaS Platform →
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comparison Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">Before vs After</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Before */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-red-600 text-sm font-bold">×</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Before</h3>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-red-200 pl-4">
                  <h4 className="font-medium text-gray-900 mb-2">Basic Configuration</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Simple strategy selection</li>
                    <li>• Basic symbol dropdown</li>
                    <li>• No data provider options</li>
                    <li>• No quality metrics</li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-200 pl-4">
                  <h4 className="font-medium text-gray-900 mb-2">Data Source</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Synthetic/fake data only</li>
                    <li>• No real market data</li>
                    <li>• No data validation</li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-200 pl-4">
                  <h4 className="font-medium text-gray-900 mb-2">User Experience</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• No quality feedback</li>
                    <li>• Basic interface design</li>
                    <li>• Limited configuration</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">After</h3>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-green-200 pl-4">
                  <h4 className="font-medium text-gray-900 mb-2">Enhanced Configuration</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Data provider selection (Kraken, Binance, CoinGecko)</li>
                    <li>• Provider descriptions and characteristics</li>
                    <li>• Multiple timeframes (1m to 1d)</li>
                    <li>• Real-time validation</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-200 pl-4">
                  <h4 className="font-medium text-gray-900 mb-2">Real Market Data</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Live BTC/USD, ETH/USD prices</li>
                    <li>• Multiple data sources</li>
                    <li>• Comprehensive validation</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-200 pl-4">
                  <h4 className="font-medium text-gray-900 mb-2">Professional UX</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Data quality dashboard</li>
                    <li>• Quality warnings and alerts</li>
                    <li>• Modern, clean interface</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">New Features Added</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📊</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Data Provider Selection</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Choose between Kraken, Binance, and CoinGecko with descriptions of each provider's characteristics.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">🔍</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Data Quality Panel</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Visual quality metrics with color coding, completeness checks, and accuracy validation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">⚠️</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Quality Warnings</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Alerts for data gaps, outliers, and quality issues with specific recommendations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">⚡</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Enhanced Configuration</h3>
              </div>
              <p className="text-gray-600 text-sm">
                All options in one clean interface with real-time validation and feedback.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-xl">📈</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Better Results Display</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Improved performance metrics with data quality context and provider information.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 text-xl">🎨</span>
                </div>
                <h3 className="ml-3 font-semibold text-gray-900">Professional Design</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Modern, clean interface with better spacing, colors, and user experience.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Ready to See the New Interface?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Visit the enhanced SaaS platform to experience all these improvements in action. 
            The new interface provides a professional, feature-rich experience with real market data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/saas" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Visit Enhanced SaaS Platform
            </a>
            <a 
              href="/demo" 
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Test Real Market Data
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 