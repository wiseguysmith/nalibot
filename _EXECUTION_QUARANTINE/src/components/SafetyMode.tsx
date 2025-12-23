import React, { useState } from 'react';

interface SafetySettings {
  maxDailyTrades: number;
  stopTradingOnLoss: boolean;
  maxLossPercentage: number;
  notifyBeforeVolatility: boolean;
  volatilityThreshold: number;
  emergencyStop: boolean;
  autoRebalance: boolean;
  maxPositionSize: number;
}

interface SafetyModeProps {
  settings: SafetySettings;
  onSettingsChange: (settings: SafetySettings) => void;
  currentRisk: number; // 0-100
  dailyStats: {
    trades: number;
    profit: number;
    loss: number;
    drawdown: number;
  };
}

export default function SafetyMode({ 
  settings, 
  onSettingsChange, 
  currentRisk, 
  dailyStats 
}: SafetyModeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRiskLevel = (risk: number) => {
    if (risk < 30) return { level: 'LOW', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (risk < 70) return { level: 'MEDIUM', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    return { level: 'HIGH', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  };

  const getRiskMeterColor = (risk: number) => {
    if (risk < 30) return 'from-green-500 to-emerald-400';
    if (risk < 70) return 'from-yellow-500 to-orange-400';
    return 'from-red-500 to-pink-400';
  };

  const updateSetting = (key: keyof SafetySettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const riskInfo = getRiskLevel(currentRisk);

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🛡️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Safety Mode</h3>
              <p className="text-gray-400 text-sm">Protect your investment with smart safety controls</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Risk Meter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Current Risk Level</span>
            <span className={`font-bold ${riskInfo.color}`}>{riskInfo.level}</span>
          </div>
          
          {/* Risk Meter Bar */}
          <div className="relative">
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getRiskMeterColor(currentRisk)} transition-all duration-500`}
                style={{ width: `${currentRisk}%` }}
              />
            </div>
            
            {/* Risk Indicators */}
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Safe</span>
              <span>Moderate</span>
              <span>High Risk</span>
            </div>
          </div>

          {/* Risk Status */}
          <div className={`mt-3 p-3 rounded-lg ${riskInfo.bgColor}`}>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${riskInfo.color}`}>
                {currentRisk < 30 ? '🟢 Safe Trading Zone' : 
                 currentRisk < 70 ? '🟡 Moderate Risk Zone' : 
                 '🔴 High Risk Zone'}
              </span>
              <span className={`text-sm ${riskInfo.color}`}>
                {currentRisk}% risk
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-700/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Daily Trades</div>
            <div className="text-white font-medium">{dailyStats.trades}/{settings.maxDailyTrades}</div>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Daily Loss</div>
            <div className="text-red-400 font-medium">${Math.abs(dailyStats.loss).toFixed(2)}</div>
          </div>
        </div>

        {/* Emergency Stop */}
        {settings.emergencyStop && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 text-lg">🚨</span>
              <div>
                <div className="text-red-400 font-medium">Emergency Stop Active</div>
                <div className="text-red-300 text-sm">Trading has been automatically stopped for your safety</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Settings */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-6 space-y-6">
          {/* Daily Limits */}
          <div>
            <h4 className="text-white font-medium mb-4">📊 Daily Limits</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Maximum Daily Trades: {settings.maxDailyTrades}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={settings.maxDailyTrades}
                  onChange={(e) => updateSetting('maxDailyTrades', Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Maximum Position Size: {settings.maxPositionSize}% of portfolio
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.maxPositionSize}
                  onChange={(e) => updateSetting('maxPositionSize', Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1%</span>
                  <span>10%</span>
                  <span>20%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Loss Protection */}
          <div>
            <h4 className="text-white font-medium mb-4">🛡️ Loss Protection</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Stop Trading on Loss</div>
                  <div className="text-gray-400 text-sm">Automatically stop trading if daily loss exceeds limit</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.stopTradingOnLoss}
                    onChange={(e) => updateSetting('stopTradingOnLoss', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {settings.stopTradingOnLoss && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Maximum Daily Loss: {settings.maxLossPercentage}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={settings.maxLossPercentage}
                    onChange={(e) => updateSetting('maxLossPercentage', Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1%</span>
                    <span>10%</span>
                    <span>20%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Volatility Alerts */}
          <div>
            <h4 className="text-white font-medium mb-4">⚡ Volatility Alerts</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Notify Before High Volatility</div>
                  <div className="text-gray-400 text-sm">Get alerts before making trades during volatile periods</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyBeforeVolatility}
                    onChange={(e) => updateSetting('notifyBeforeVolatility', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {settings.notifyBeforeVolatility && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Volatility Threshold: {settings.volatilityThreshold}%
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={settings.volatilityThreshold}
                    onChange={(e) => updateSetting('volatilityThreshold', Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>5%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Safety */}
          <div>
            <h4 className="text-white font-medium mb-4">🔧 Advanced Safety</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Auto-Rebalance Portfolio</div>
                  <div className="text-gray-400 text-sm">Automatically adjust strategy allocations for optimal risk</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoRebalance}
                    onChange={(e) => updateSetting('autoRebalance', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Safety Tips */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-blue-400 text-lg">💡</span>
              <div>
                <h5 className="text-blue-400 font-medium">Safety Tips</h5>
                <ul className="text-blue-300 text-sm mt-2 space-y-1">
                  <li>• Start with conservative settings and adjust gradually</li>
                  <li>• Never invest more than you can afford to lose</li>
                  <li>• Monitor your risk meter regularly</li>
                  <li>• Use stop-loss limits to protect your capital</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 