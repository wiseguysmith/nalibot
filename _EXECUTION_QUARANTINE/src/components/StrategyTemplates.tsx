import React, { useState, useEffect } from 'react';

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'very-low' | 'medium-high';
  expectedReturn: {
    min: number;
    max: number;
    average: number;
    range?: [number, number];
    maxDrawdown?: number;
  };
  maxDrawdown: number;
  timeHorizon: string;
  timeHorizonMonths?: number;
  allocation: {
    meanReversion: number;
    arbitrage: number;
    gridTrading: number;
    mlPrediction: number;
  };
  strategyMix?: {
    meanReversion: number;
    arbitrage: number;
    gridTrading: number;
    mlPrediction: number;
  };
  features: string[];
  keyFeatures?: string[];
  color: string;
  icon: string;
  coreLogicDescription?: string;
  behaviorDescription?: string;
}

// Fallback strategy templates (used if API fails)
const fallbackStrategyTemplates: StrategyTemplate[] = [
  {
    id: 'breadbot-conservative',
    name: 'BreadBot Conservative',
    description: 'Steady, low-risk trading focused on capital preservation with consistent small gains.',
    riskLevel: 'low',
    expectedReturn: { min: 8, max: 15, average: 12 },
    maxDrawdown: 5,
    timeHorizon: '3-6 months',
    allocation: {
      meanReversion: 50,
      arbitrage: 30,
      gridTrading: 15,
      mlPrediction: 5
    },
    features: [
      'Capital preservation focus',
      'Low volatility strategies',
      'Conservative position sizing',
      'Frequent small wins',
      'Minimal drawdown risk'
    ],
    color: 'from-green-500 to-emerald-400',
    icon: '🛡️'
  },
  {
    id: 'breadbot-balanced',
    name: 'BreadBot Balanced',
    description: 'Balanced approach combining steady growth with moderate risk for optimal returns.',
    riskLevel: 'medium',
    expectedReturn: { min: 15, max: 25, average: 20 },
    maxDrawdown: 10,
    timeHorizon: '6-12 months',
    allocation: {
      meanReversion: 40,
      arbitrage: 25,
      gridTrading: 25,
      mlPrediction: 10
    },
    features: [
      'Balanced risk/reward',
      'Diversified strategy mix',
      'Moderate growth focus',
      'Controlled volatility',
      'Steady compound returns'
    ],
    color: 'from-blue-500 to-cyan-400',
    icon: '⚖️'
  },
  {
    id: 'breadbot-aggressive',
    name: 'BreadBot Aggressive',
    description: 'High-growth strategy maximizing returns through aggressive trading and ML predictions.',
    riskLevel: 'high',
    expectedReturn: { min: 25, max: 40, average: 32 },
    maxDrawdown: 15,
    timeHorizon: '12+ months',
    allocation: {
      meanReversion: 25,
      arbitrage: 20,
      gridTrading: 30,
      mlPrediction: 25
    },
    features: [
      'Maximum growth potential',
      'Advanced ML strategies',
      'Higher volatility tolerance',
      'Aggressive position sizing',
      'Long-term wealth building'
    ],
    color: 'from-purple-500 to-pink-400',
    icon: '🚀'
  },
  {
    id: 'breadbot-income',
    name: 'BreadBot Income',
    description: 'Income-focused strategy generating regular cash flow through grid trading and arbitrage.',
    riskLevel: 'low',
    expectedReturn: { min: 10, max: 18, average: 14 },
    maxDrawdown: 6,
    timeHorizon: '3-6 months',
    allocation: {
      meanReversion: 20,
      arbitrage: 50,
      gridTrading: 25,
      mlPrediction: 5
    },
    features: [
      'Regular income generation',
      'High-frequency arbitrage',
      'Grid-based cash flow',
      'Low capital requirements',
      'Consistent monthly returns'
    ],
    color: 'from-yellow-500 to-orange-400',
    icon: '💰'
  },
  {
    id: 'breadbot-momentum',
    name: 'BreadBot Momentum',
    description: 'Momentum-based strategy that rides market trends and breakouts for maximum gains.',
    riskLevel: 'high',
    expectedReturn: { min: 20, max: 50, average: 35 },
    maxDrawdown: 20,
    timeHorizon: '6-12 months',
    allocation: {
      meanReversion: 10,
      arbitrage: 15,
      gridTrading: 20,
      mlPrediction: 55
    },
    features: [
      'Trend-following approach',
      'Breakout detection',
      'Momentum indicators',
      'High reward potential',
      'Market timing focus'
    ],
    color: 'from-red-500 to-pink-400',
    icon: '📈'
  },
  {
    id: 'breadbot-seasonal',
    name: 'BreadBot Seasonal',
    description: 'Seasonal strategy that adapts to market cycles and crypto calendar events.',
    riskLevel: 'medium',
    expectedReturn: { min: 12, max: 30, average: 22 },
    maxDrawdown: 12,
    timeHorizon: '12+ months',
    allocation: {
      meanReversion: 30,
      arbitrage: 20,
      gridTrading: 30,
      mlPrediction: 20
    },
    features: [
      'Seasonal pattern recognition',
      'Event-driven trading',
      'Market cycle adaptation',
      'Holiday effect capture',
      'Calendar-based optimization'
    ],
    color: 'from-indigo-500 to-purple-400',
    icon: '📅'
  },
  {
    id: 'breadbot-defensive',
    name: 'BreadBot Defensive',
    description: 'Defensive strategy designed for bear markets and high volatility periods.',
    riskLevel: 'low',
    expectedReturn: { min: 5, max: 12, average: 8 },
    maxDrawdown: 3,
    timeHorizon: '6-12 months',
    allocation: {
      meanReversion: 60,
      arbitrage: 25,
      gridTrading: 10,
      mlPrediction: 5
    },
    features: [
      'Bear market protection',
      'Capital preservation',
      'Defensive positioning',
      'Low correlation strategies',
      'Safe haven approach'
    ],
    color: 'from-gray-500 to-slate-400',
    icon: '🛡️'
  },
  {
    id: 'breadbot-scalping',
    name: 'BreadBot Scalping',
    description: 'Ultra-short-term strategy making many small profits through rapid trades.',
    riskLevel: 'medium',
    expectedReturn: { min: 15, max: 35, average: 25 },
    maxDrawdown: 8,
    timeHorizon: '1-3 months',
    allocation: {
      meanReversion: 15,
      arbitrage: 40,
      gridTrading: 35,
      mlPrediction: 10
    },
    features: [
      'High-frequency trading',
      'Small profit accumulation',
      'Rapid trade execution',
      'Low holding periods',
      'Volume-based profits'
    ],
    color: 'from-teal-500 to-cyan-400',
    icon: '⚡'
  }
];

interface StrategyTemplatesProps {
  onSelectTemplate: (template: StrategyTemplate) => void;
  selectedTemplate?: string;
}

export default function StrategyTemplates({ onSelectTemplate, selectedTemplate }: StrategyTemplatesProps) {
  const [customRisk, setCustomRisk] = useState(50);
  const [customTimeHorizon, setCustomTimeHorizon] = useState(6);
  const [strategyTemplates, setStrategyTemplates] = useState<StrategyTemplate[]>(fallbackStrategyTemplates);
  const [isLoading, setIsLoading] = useState(true);

  // Map strategy names to icons and colors
  const strategyStyles: { [key: string]: { icon: string; color: string } } = {
    conservative: { icon: '🛡️', color: 'from-green-500 to-emerald-400' },
    balanced: { icon: '⚖️', color: 'from-blue-500 to-cyan-400' },
    aggressive: { icon: '🚀', color: 'from-purple-500 to-pink-400' },
    income: { icon: '💰', color: 'from-yellow-500 to-orange-400' },
    momentum: { icon: '📈', color: 'from-red-500 to-pink-400' },
    seasonal: { icon: '📅', color: 'from-indigo-500 to-purple-400' },
    defensive: { icon: '🛡️', color: 'from-gray-500 to-slate-400' },
    scalping: { icon: '⚡', color: 'from-teal-500 to-cyan-400' }
  };

  useEffect(() => {
    // Fetch strategies from API
    const fetchStrategies = async () => {
      try {
        const response = await fetch('/api/strategies/list');
        const data = await response.json();
        
        if (data.success && data.strategies) {
          // Transform API data to match component format
          const transformed = data.strategies.map((strategy: any) => {
            const style = strategyStyles[strategy.id] || { icon: '🤖', color: 'from-gray-500 to-gray-400' };
            return {
              id: strategy.id,
              name: strategy.name,
              description: strategy.coreLogicDescription || strategy.behaviorDescription || '',
              riskLevel: strategy.riskLevel,
              expectedReturn: {
                min: strategy.expectedReturn?.range?.[0] * 100 || strategy.expectedReturn?.avg * 100 * 0.8,
                max: strategy.expectedReturn?.range?.[1] * 100 || strategy.expectedReturn?.avg * 100 * 1.2,
                average: strategy.expectedReturn?.avg * 100 || 15,
                range: strategy.expectedReturn?.range,
                maxDrawdown: strategy.expectedReturn?.maxDrawdown
              },
              maxDrawdown: (strategy.expectedReturn?.maxDrawdown || 0.1) * 100,
              timeHorizon: `${strategy.timeHorizonMonths || 6} months`,
              timeHorizonMonths: strategy.timeHorizonMonths,
              allocation: strategy.strategyMix || {
                meanReversion: 0,
                arbitrage: 0,
                gridTrading: 0,
                mlPrediction: 0
              },
              strategyMix: strategy.strategyMix,
              features: strategy.keyFeatures || [],
              keyFeatures: strategy.keyFeatures,
              color: style.color,
              icon: style.icon,
              coreLogicDescription: strategy.coreLogicDescription,
              behaviorDescription: strategy.behaviorDescription
            };
          });
          setStrategyTemplates(transformed);
        }
      } catch (error) {
        console.error('Failed to fetch strategies:', error);
        // Use fallback templates
        setStrategyTemplates(fallbackStrategyTemplates);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your AutoBread Strategy</h2>
        <p className="text-gray-400">Select a pre-built strategy or customize your own</p>
      </div>

      {/* Strategy Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {strategyTemplates.map((template) => (
          <div
            key={template.id}
            className={`relative bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border-2 cursor-pointer transition-all hover:scale-105 ${
              selectedTemplate === template.id
                ? `border-${template.color.split('-')[1]}-500`
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            {/* Selection Indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${template.color} rounded-xl flex items-center justify-center mr-4`}>
                <span className="text-white text-xl">{template.icon}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{template.name}</h3>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  template.riskLevel === 'low' || template.riskLevel === 'very-low' ? 'bg-green-500/20 text-green-400' :
                  template.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {template.riskLevel.replace('-', ' ').toUpperCase()} RISK
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm mb-4">{template.description}</p>

            {/* Expected Returns */}
            <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-2">Expected Returns</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Average:</span>
                  <span className="text-green-400 font-medium">{template.expectedReturn.average}% monthly</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Range:</span>
                  <span className="text-white">{template.expectedReturn.min}% - {template.expectedReturn.max}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Drawdown:</span>
                  <span className="text-red-400">{template.maxDrawdown}%</span>
                </div>
              </div>
            </div>

            {/* Strategy Allocation */}
            <div className="mb-4">
              <h4 className="text-white font-medium mb-2">Strategy Mix</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Mean Reversion:</span>
                  <span className="text-white">{(template.allocation.meanReversion * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Arbitrage:</span>
                  <span className="text-white">{(template.allocation.arbitrage * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Grid Trading:</span>
                  <span className="text-white">{(template.allocation.gridTrading * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">ML Prediction:</span>
                  <span className="text-white">{(template.allocation.mlPrediction * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-white font-medium mb-2">Key Features</h4>
              <ul className="space-y-1">
                {(template.keyFeatures || template.features).map((feature, index) => (
                  <li key={index} className="text-gray-300 text-sm flex items-center">
                    <span className="text-green-400 mr-2">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Core Logic Description */}
            {template.coreLogicDescription && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-white font-medium mb-2 text-sm">Core Logic</h4>
                <p className="text-gray-300 text-xs">{template.coreLogicDescription}</p>
              </div>
            )}

            {/* Time Horizon */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Time Horizon:</span>
                <span className="text-white">{template.timeHorizon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Strategy Builder */}
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Custom Strategy Builder</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Tolerance */}
          <div>
            <label className="block text-white font-medium mb-2">Risk Tolerance</label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={customRisk}
                onChange={(e) => setCustomRisk(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-400">
                <span>Conservative</span>
                <span className="text-white">{customRisk}%</span>
                <span>Aggressive</span>
              </div>
            </div>
          </div>

          {/* Time Horizon */}
          <div>
            <label className="block text-white font-medium mb-2">Time Horizon (months)</label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="24"
                value={customTimeHorizon}
                onChange={(e) => setCustomTimeHorizon(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-400">
                <span>1 month</span>
                <span className="text-white">{customTimeHorizon} months</span>
                <span>24 months</span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Strategy Preview */}
        <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Custom Strategy Preview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Expected Return:</span>
              <span className="text-green-400 ml-2">{(customRisk * 0.3 + 10).toFixed(1)}% monthly</span>
            </div>
            <div>
              <span className="text-gray-400">Max Drawdown:</span>
              <span className="text-red-400 ml-2">{(customRisk * 0.15).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-400">Risk Level:</span>
              <span className={`ml-2 ${
                customRisk < 30 ? 'text-green-400' :
                customRisk < 70 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {customRisk < 30 ? 'LOW' : customRisk < 70 ? 'MEDIUM' : 'HIGH'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Strategy Mix:</span>
              <span className="text-white ml-2">Balanced</span>
            </div>
          </div>
        </div>

        <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all">
          Create Custom Strategy
        </button>
      </div>
    </div>
  );
} 