/**
 * Operator Overview Page
 * 
 * OPERATOR INTERFACE: Internal Read-Only Operator Dashboard
 * 
 * Purpose: "Is everything okay?"
 * 
 * Displays:
 * - System mode
 * - Health status
 * - Current regime + confidence
 * - Last snapshot timestamp
 * - Active alerts
 * 
 * Design: Calm, boring, low-stress
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemStatus {
  mode: string;
  riskState: string;
  tradingAllowed: boolean;
  currentRegime?: {
    regime: string;
    confidence: number;
  };
  timestamp: string;
}

interface HealthStatus {
  healthy: boolean;
  uptime: number;
  uptimeString: string;
  lastMarketDataUpdate: string | null;
  lastEventLogWrite: string | null;
  lastSnapshotWrite: string | null;
  executionQueueStatus: string;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  errorRate: number;
  timestamp: string;
}

interface LastSnapshot {
  date: string;
  timestamp: string;
  totalSystemEquity: number;
  systemDrawdown: number;
  tradesExecuted: number;
  tradesBlocked: number;
}

export default function OperatorOverview() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<LastSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch system status
      const statusRes = await fetch('/api/health/status');
      const statusData = await statusRes.json();
      
      // Fetch health
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      
      // Fetch last snapshot
      const snapshotRes = await fetch('/api/health/last_snapshot');
      const snapshotData = await snapshotRes.json();

      if (statusData.success) {
        setStatus(statusData.status);
      }
      
      if (healthData.success) {
        setHealth(healthData.health);
      }
      
      if (snapshotData.success && snapshotData.snapshot) {
        setLastSnapshot({
          date: snapshotData.snapshot.date,
          timestamp: snapshotData.snapshot.timestamp,
          totalSystemEquity: snapshotData.snapshot.totalSystemEquity,
          systemDrawdown: snapshotData.snapshot.systemDrawdown,
          tradesExecuted: snapshotData.snapshot.tradesExecuted,
          tradesBlocked: snapshotData.snapshot.tradesBlocked
        });
      }
      
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch overview data:', err);
      setError(err.message || 'Failed to fetch data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds (calm, not frantic)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (mode: string) => {
    switch (mode) {
      case 'AGGRESSIVE': return 'text-green-600';
      case 'OBSERVE_ONLY': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthColor = (healthy: boolean) => {
    return healthy ? 'text-green-600' : 'text-red-600';
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'FAVORABLE': return 'text-green-600';
      case 'UNFAVORABLE': return 'text-red-600';
      case 'UNKNOWN': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-gray-600">Loading system status...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Operator Overview</h1>
          <p className="text-gray-600">System status and health monitoring</p>
        </div>

        {/* Navigation */}
        <nav className="mb-8 flex space-x-4 border-b border-gray-200 pb-4">
          <Link href="/operator/overview" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">
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
          <Link href="/operator/simulation" className="text-gray-600 hover:text-gray-900">
            Simulation
          </Link>
        </nav>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* System Mode */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">System Mode</h3>
            <p className={`text-2xl font-bold ${getStatusColor(status?.mode || 'UNKNOWN')}`}>
              {status?.mode || 'UNKNOWN'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Risk State: {status?.riskState || 'UNKNOWN'}
            </p>
          </div>

          {/* Health Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">System Health</h3>
            <p className={`text-2xl font-bold ${getHealthColor(health?.healthy || false)}`}>
              {health?.healthy ? '✓ Healthy' : '✗ Unhealthy'}
            </p>
            {health && (
              <p className="text-sm text-gray-500 mt-1">
                Uptime: {health.uptimeString || 'N/A'}
              </p>
            )}
          </div>

          {/* Current Regime */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Market Regime</h3>
            {status?.currentRegime ? (
              <>
                <p className={`text-2xl font-bold ${getRegimeColor(status.currentRegime.regime)}`}>
                  {status.currentRegime.regime}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Confidence: {(status.currentRegime.confidence * 100).toFixed(0)}%
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-400">UNKNOWN</p>
            )}
          </div>
        </div>

        {/* Last Snapshot */}
        {lastSnapshot && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Last Snapshot</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-lg font-semibold text-gray-900">{lastSnapshot.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">System Equity</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${lastSnapshot.totalSystemEquity.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Drawdown</p>
                <p className={`text-lg font-semibold ${lastSnapshot.systemDrawdown > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {lastSnapshot.systemDrawdown.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Trades Executed</p>
                <p className="text-lg font-semibold text-gray-900">{lastSnapshot.tradesExecuted}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link 
                href={`/operator/snapshots?date=${lastSnapshot.date}`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View snapshot details →
              </Link>
            </div>
          </div>
        )}

        {/* System Details */}
        {health && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Memory Usage</h3>
                <p className="text-gray-900">
                  {health.memoryUsage.heapUsed.toFixed(0)} MB / {health.memoryUsage.heapTotal.toFixed(0)} MB
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  RSS: {health.memoryUsage.rss.toFixed(0)} MB
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Execution Queue</h3>
                <p className="text-gray-900">{health.executionQueueStatus}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Error Rate</h3>
                <p className="text-gray-900">{health.errorRate.toFixed(2)} errors/min</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updates</h3>
                <p className="text-sm text-gray-600">
                  Market Data: {health.lastMarketDataUpdate ? new Date(health.lastMarketDataUpdate).toLocaleString() : 'Never'}
                </p>
                <p className="text-sm text-gray-600">
                  Event Log: {health.lastEventLogWrite ? new Date(health.lastEventLogWrite).toLocaleString() : 'Never'}
                </p>
                <p className="text-sm text-gray-600">
                  Snapshot: {health.lastSnapshotWrite ? new Date(health.lastSnapshotWrite).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Read-only operator interface • Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

