import React, { useState, useEffect } from 'react';
import { BacktestingDashboard } from '../components/BacktestingDashboard';
import { BacktestResult } from '../services/backtestingEngine';

export default function BacktestingPage() {
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const runBacktest = async () => {
    setIsRunning(true);
    setProgress(0);
    setStatus('Initializing backtesting engine...');

    try {
      // Simulate backtesting process with progress updates
      setProgress(10);
      setStatus('Loading historical data...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(30);
      setStatus('Running strategy backtests...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgress(60);
      setStatus('Analyzing performance metrics...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(80);
      setStatus('Generating reports...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress(100);
      setStatus('Backtesting completed!');

      // For demo purposes, we'll generate sample results
      // In production, this would call your actual backtesting API
      const sampleResults: BacktestResult[] = [
        {
          strategy: 'MeanReversion',
          totalTrades: 45,
          winningTrades: 28,
          losingTrades: 17,
          winRate: 0.622,
          totalReturn: 12.5,
          sharpeRatio: 1.45,
          maxDrawdown: 8.2,
          trades: [],
          equity: Array.from({ length: 180 }, (_, i) => 10000 + (i * 0.07)),
          dates: Array.from({ length: 180 }, (_, i) => 
            new Date(Date.now() - (180 - i) * 24 * 60 * 60 * 1000).toISOString()
          )
        },
        {
          strategy: 'TrendFollowing',
          totalTrades: 32,
          winningTrades: 19,
          losingTrades: 13,
          winRate: 0.594,
          totalReturn: 18.7,
          sharpeRatio: 1.23,
          maxDrawdown: 12.1,
          trades: [],
          equity: Array.from({ length: 180 }, (_, i) => 10000 + (i * 0.104)),
          dates: Array.from({ length: 180 }, (_, i) => 
            new Date(Date.now() - (180 - i) * 24 * 60 * 60 * 1000).toISOString()
          )
        },
        {
          strategy: 'Arbitrage',
          totalTrades: 67,
          winningTrades: 41,
          losingTrades: 26,
          winRate: 0.612,
          totalReturn: 8.9,
          sharpeRatio: 0.87,
          maxDrawdown: 5.8,
          trades: [],
          equity: Array.from({ length: 180 }, (_, i) => 10000 + (i * 0.049)),
          dates: Array.from({ length: 180 }, (_, i) => 
            new Date(Date.now() - (180 - i) * 24 * 60 * 60 * 1000).toISOString()
          )
        },
        {
          strategy: 'GridTrading',
          totalTrades: 89,
          winningTrades: 52,
          losingTrades: 37,
          winRate: 0.584,
          totalReturn: 15.3,
          sharpeRatio: 1.12,
          maxDrawdown: 9.5,
          trades: [],
          equity: Array.from({ length: 180 }, (_, i) => 10000 + (i * 0.085)),
          dates: Array.from({ length: 180 }, (_, i) => 
            new Date(Date.now() - (180 - i) * 24 * 60 * 60 * 1000).toISOString()
          )
        },
        {
          strategy: 'VolatilityBreakout',
          totalTrades: 23,
          winningTrades: 14,
          losingTrades: 9,
          winRate: 0.609,
          totalReturn: 22.1,
          sharpeRatio: 1.67,
          maxDrawdown: 14.3,
          trades: [],
          equity: Array.from({ length: 180 }, (_, i) => 10000 + (i * 0.123)),
          dates: Array.from({ length: 180 }, (_, i) => 
            new Date(Date.now() - (180 - i) * 24 * 60 * 60 * 1000).toISOString()
          )
        }
      ];

      setResults(sampleResults);
      
      // Reset after showing completion
      setTimeout(() => {
        setIsRunning(false);
        setProgress(0);
        setStatus('');
      }, 2000);

    } catch (error) {
      console.error('Backtesting error:', error);
      setStatus('Error occurred during backtesting');
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Backtesting</h1>
              <p className="mt-2 text-sm text-gray-600">
                Test and validate your trading strategies with historical data
              </p>
            </div>
            
            <button
              onClick={runBacktest}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isRunning ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600 min-w-[200px]">
                {status}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {results.length === 0 && !isRunning ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No backtesting results</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by running a backtest to analyze your trading strategies.
            </p>
            <div className="mt-6">
              <button
                onClick={runBacktest}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Run Your First Backtest
              </button>
            </div>
          </div>
        ) : (
          <BacktestingDashboard results={results} />
        )}
      </div>
    </div>
  );
}
