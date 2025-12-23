/**
 * Operator Simulation Page
 * 
 * OPERATOR INTERFACE: Internal Read-Only Operator Dashboard
 * 
 * Purpose: "What's happening in SIM mode?"
 * 
 * Displays:
 * - Live SIM trades feed
 * - Performance metrics (capital, PnL, win rate)
 * - Open positions
 * - Strategy performance breakdown
 * 
 * Design: Real-time, read-only, operator-focused
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SimTrade {
  eventId: string;
  timestamp: string;
  strategyId: string;
  pair: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  executionType?: 'SIMULATED' | 'REAL' | 'SHADOW' | 'SENTINEL';
  orderId?: string;
  executedValue: number;
  metadata?: {
    pnl?: number;
    slippage?: number;
    fees?: number;
    executionPrice?: number;
    quantity?: number;
  };
}

interface Position {
  pair: string;
  action: 'buy' | 'sell';
  entryPrice: number;
  quantity: number;
  entryTimestamp: Date;
  currentPrice?: number;
  unrealizedPnL?: number;
}

interface PerformanceMetrics {
  currentCapital: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  averageTradeSize: number;
}

interface StrategyPerformance {
  strategyId: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
}

export default function OperatorSimulation() {
  const [trades, setTrades] = useState<SimTrade[]>([]);
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [strategyPerformance, setStrategyPerformance] = useState<Map<string, StrategyPerformance>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialCapital] = useState(100); // Default from PAPER_TRADING_INITIAL_CAPITAL

  const fetchSimTrades = async () => {
    try {
      const response = await fetch('/api/observability/events?eventType=TRADE_EXECUTED&executionType=SIMULATED&limit=50');
      const data = await response.json();

      if (data.success) {
        const simTrades = data.events
          .filter((e: any) => e.executionType === 'SIMULATED')
          .map((e: any) => ({
            eventId: e.eventId,
            timestamp: e.timestamp,
            strategyId: e.strategyId || 'unknown',
            pair: e.pair,
            action: e.action,
            amount: e.amount,
            price: e.price,
            executionType: e.executionType,
            orderId: e.orderId,
            executedValue: e.executedValue,
            metadata: e.metadata || {}
          }));

        setTrades(simTrades);

        // Update positions from trades
        const newPositions = new Map<string, Position>();
        const processedPairs = new Set<string>();

        // Process trades in chronological order
        const sortedTrades = [...simTrades].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const trade of sortedTrades) {
          const key = `${trade.pair}_${trade.action}`;
          
          if (trade.action === 'buy') {
            // Open or add to long position
            const existing = newPositions.get(trade.pair);
            if (existing && existing.action === 'buy') {
              // Average entry price
              const totalValue = (existing.entryPrice * existing.quantity) + (trade.price * trade.amount);
              const totalQuantity = existing.quantity + trade.amount;
              newPositions.set(trade.pair, {
                pair: trade.pair,
                action: 'buy',
                entryPrice: totalValue / totalQuantity,
                quantity: totalQuantity,
                entryTimestamp: existing.entryTimestamp
              });
            } else {
              newPositions.set(trade.pair, {
                pair: trade.pair,
                action: 'buy',
                entryPrice: trade.price,
                quantity: trade.amount,
                entryTimestamp: new Date(trade.timestamp)
              });
            }
          } else if (trade.action === 'sell') {
            // Close long position or open short
            const existing = newPositions.get(trade.pair);
            if (existing && existing.action === 'buy') {
              // Close long position
              const closedQuantity = Math.min(existing.quantity, trade.amount);
              if (closedQuantity >= existing.quantity) {
                // Fully closed
                newPositions.delete(trade.pair);
              } else {
                // Partially closed
                newPositions.set(trade.pair, {
                  ...existing,
                  quantity: existing.quantity - closedQuantity
                });
              }
            } else {
              // Open short position
              const existingShort = newPositions.get(trade.pair);
              if (existingShort && existingShort.action === 'sell') {
                const totalValue = (existingShort.entryPrice * existingShort.quantity) + (trade.price * trade.amount);
                const totalQuantity = existingShort.quantity + trade.amount;
                newPositions.set(trade.pair, {
                  pair: trade.pair,
                  action: 'sell',
                  entryPrice: totalValue / totalQuantity,
                  quantity: totalQuantity,
                  entryTimestamp: existingShort.entryTimestamp
                });
              } else {
                newPositions.set(trade.pair, {
                  pair: trade.pair,
                  action: 'sell',
                  entryPrice: trade.price,
                  quantity: trade.amount,
                  entryTimestamp: new Date(trade.timestamp)
                });
              }
            }
          }
        }

        setPositions(newPositions);

        // Calculate metrics
        let totalPnL = 0;
        let winningTrades = 0;
        let totalTradeValue = 0;

        for (const trade of simTrades) {
          if (trade.metadata?.pnl !== undefined) {
            totalPnL += trade.metadata.pnl;
            if (trade.metadata.pnl > 0) {
              winningTrades++;
            }
          }
          totalTradeValue += trade.executedValue;
        }

        const currentCapital = initialCapital + totalPnL;
        const winRate = simTrades.length > 0 ? (winningTrades / simTrades.length) * 100 : 0;
        const averageTradeSize = simTrades.length > 0 ? totalTradeValue / simTrades.length : 0;

        setMetrics({
          currentCapital,
          totalPnL,
          winRate,
          totalTrades: simTrades.length,
          averageTradeSize
        });

        // Calculate strategy performance
        const strategyMap = new Map<string, StrategyPerformance>();
        for (const trade of simTrades) {
          const strategyId = trade.strategyId;
          const existing = strategyMap.get(strategyId) || {
            strategyId,
            totalTrades: 0,
            totalPnL: 0,
            winRate: 0
          };

          existing.totalTrades++;
          if (trade.metadata?.pnl !== undefined) {
            existing.totalPnL += trade.metadata.pnl;
            if (trade.metadata.pnl > 0) {
              existing.winRate = (existing.winRate * (existing.totalTrades - 1) + 1) / existing.totalTrades;
            } else {
              existing.winRate = (existing.winRate * (existing.totalTrades - 1)) / existing.totalTrades;
            }
          }

          strategyMap.set(strategyId, existing);
        }

        setStrategyPerformance(strategyMap);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch SIM trades');
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch SIM trades:', err);
      setError(err.message || 'Failed to fetch SIM trades');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSimTrades();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchSimTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  const getActionColor = (action: string) => {
    return action === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  const getActionBgColor = (action: string) => {
    return action === 'buy' ? 'bg-green-50' : 'bg-red-50';
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-gray-600">Loading simulation data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-gray-600 mt-4">
              Make sure SIM mode is running: <code className="bg-gray-100 px-2 py-1 rounded">npm run paper-trading</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Simulation Mode</h1>
              <p className="text-gray-600">Live SIM mode activity and performance</p>
            </div>
            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold text-sm">
              SIMULATION MODE
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mb-8 flex space-x-4 border-b border-gray-200 pb-4">
          <Link href="/operator/overview" className="text-gray-600 hover:text-gray-900">
            Overview
          </Link>
          <Link href="/operator/accounts" className="text-gray-600 hover:text-gray-900">
            Accounts
          </Link>
          <Link href="/operator/snapshots" className="text-gray-600 hover:text-gray-900">
            Snapshots
          </Link>
          <Link href="/operator/events" className="text-gray-600 hover:text-gray-900">
            Events
          </Link>
          <Link href="/operator/confidence" className="text-gray-600 hover:text-gray-900">
            Confidence
          </Link>
          <Link href="/operator/simulation" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">
            Simulation
          </Link>
        </nav>

        {/* Performance Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Current Capital</p>
              <p className="text-2xl font-bold text-gray-900">
                ${metrics.currentCapital.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Total PnL</p>
              <p className={`text-2xl font-bold ${getPnLColor(metrics.totalPnL)}`}>
                {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Total Trades</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalTrades}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Avg Trade Size</p>
              <p className="text-2xl font-bold text-gray-900">
                ${metrics.averageTradeSize.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Live Trades Feed */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Trades Feed</h2>
            {trades.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No SIM trades yet</p>
                <p className="text-sm mt-2">Start SIM mode to see trades here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trades.slice(0, 50).map((trade) => (
                  <div
                    key={trade.eventId}
                    className={`border rounded-lg p-3 ${getActionBgColor(trade.action)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`font-semibold ${getActionColor(trade.action)}`}>
                          {trade.action.toUpperCase()}
                        </span>
                        <span className="ml-2 text-gray-700">{trade.amount.toFixed(6)} {trade.pair}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Price: </span>
                        <span className="font-medium">${trade.price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Value: </span>
                        <span className="font-medium">${trade.executedValue.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Strategy: </span>
                        <span className="font-medium">{trade.strategyId}</span>
                      </div>
                      {trade.metadata?.pnl !== undefined && (
                        <div>
                          <span className="text-gray-500">PnL: </span>
                          <span className={`font-medium ${getPnLColor(trade.metadata.pnl)}`}>
                            {trade.metadata.pnl >= 0 ? '+' : ''}${trade.metadata.pnl.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {trade.metadata?.fees !== undefined && (
                        <div>
                          <span className="text-gray-500">Fees: </span>
                          <span className="font-medium">${trade.metadata.fees.toFixed(2)}</span>
                        </div>
                      )}
                      {trade.metadata?.slippage !== undefined && (
                        <div>
                          <span className="text-gray-500">Slippage: </span>
                          <span className="font-medium">${trade.metadata.slippage.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Positions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Open Positions</h2>
            {positions.size === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No open positions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from(positions.values()).map((position) => (
                  <div
                    key={position.pair}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`font-semibold ${getActionColor(position.action)}`}>
                          {position.action.toUpperCase()}
                        </span>
                        <span className="ml-2 text-gray-700">{position.pair}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {position.entryTimestamp.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Entry Price: </span>
                        <span className="font-medium">${position.entryPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantity: </span>
                        <span className="font-medium">{position.quantity.toFixed(6)}</span>
                      </div>
                      {position.currentPrice !== undefined && (
                        <>
                          <div>
                            <span className="text-gray-500">Current Price: </span>
                            <span className="font-medium">${position.currentPrice.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Unrealized PnL: </span>
                            <span className={`font-medium ${getPnLColor(position.unrealizedPnL || 0)}`}>
                              {position.unrealizedPnL !== undefined && position.unrealizedPnL >= 0 ? '+' : ''}
                              ${position.unrealizedPnL?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Strategy Performance */}
        {strategyPerformance.size > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Strategy Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trades</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total PnL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from(strategyPerformance.values()).map((strategy) => (
                    <tr key={strategy.strategyId}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{strategy.strategyId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{strategy.totalTrades}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${getPnLColor(strategy.totalPnL)}`}>
                        {strategy.totalPnL >= 0 ? '+' : ''}${strategy.totalPnL.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(strategy.winRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Read-only operator interface • Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-1 text-xs">
            Auto-refreshes every 5 seconds • SIM mode trades only
          </p>
        </div>
      </div>
    </div>
  );
}
