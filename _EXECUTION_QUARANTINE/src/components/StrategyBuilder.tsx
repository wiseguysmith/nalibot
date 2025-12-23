import React, { useState } from 'react';

interface StrategyBuilderProps {
  onSave: (strategy: any) => void;
  onCancel: () => void;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({ onSave, onCancel }) => {
  const [strategyData, setStrategyData] = useState({
    name: '',
    type: 'trendFollowing',
    isActive: true,
    parameters: {
      timeframe: '1h',
      riskPercent: 2,
      stopLoss: 5,
      takeProfit: 10,
      maxPositions: 3
    }
  });

  const strategyTypes = [
    {
      id: 'trendFollowing',
      name: 'Trend Following',
      description: 'Follow market trends using moving averages',
      icon: '📈',
      color: 'bg-blue-500'
    },
    {
      id: 'meanReversion',
      name: 'Mean Reversion',
      description: 'Trade reversals using RSI and Bollinger Bands',
      icon: '🔄',
      color: 'bg-green-500'
    },
    {
      id: 'arbitrage',
      name: 'Arbitrage',
      description: 'Profit from price differences across exchanges',
      icon: '⚖️',
      color: 'bg-purple-500'
    },
    {
      id: 'gridTrading',
      name: 'Grid Trading',
      description: 'Automated grid-based trading strategy',
      icon: '🔲',
      color: 'bg-orange-500'
    },
    {
      id: 'volatilityBreakout',
      name: 'Volatility Breakout',
      description: 'Trade breakouts using ATR and volume',
      icon: '💥',
      color: 'bg-red-500'
    }
  ];

  const timeframes = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' }
  ];

  const handleParameterChange = (key: string, value: any) => {
    setStrategyData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    if (!strategyData.name.trim()) {
      alert('Please enter a strategy name');
      return;
    }
    onSave(strategyData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Strategy</h2>
              <p className="text-blue-100 mt-1">Build your custom trading strategy</p>
            </div>
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Strategy Type Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Strategy Type</h3>
              <div className="space-y-3">
                {strategyTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setStrategyData(prev => ({ ...prev, type: type.id }))}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      strategyData.type === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                      {strategyData.type === type.id && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Strategy Configuration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Strategy</h3>
              
              {/* Strategy Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={strategyData.name}
                  onChange={(e) => setStrategyData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter strategy name"
                />
              </div>

              {/* Timeframe */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeframe
                </label>
                <select
                  value={strategyData.parameters.timeframe}
                  onChange={(e) => handleParameterChange('timeframe', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timeframes.map((tf) => (
                    <option key={tf.value} value={tf.value}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Risk Management */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-gray-900">Risk Management</h4>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Risk per Trade: {strategyData.parameters.riskPercent}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={strategyData.parameters.riskPercent}
                    onChange={(e) => handleParameterChange('riskPercent', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Stop Loss: {strategyData.parameters.stopLoss}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={strategyData.parameters.stopLoss}
                      onChange={(e) => handleParameterChange('stopLoss', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Take Profit: {strategyData.parameters.takeProfit}%
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="1"
                      value={strategyData.parameters.takeProfit}
                      onChange={(e) => handleParameterChange('takeProfit', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Max Positions: {strategyData.parameters.maxPositions}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={strategyData.parameters.maxPositions}
                    onChange={(e) => handleParameterChange('maxPositions', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>

              {/* Strategy Status */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={strategyData.isActive}
                    onChange={(e) => setStrategyData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Activate strategy immediately</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
            >
              Create Strategy
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}; 