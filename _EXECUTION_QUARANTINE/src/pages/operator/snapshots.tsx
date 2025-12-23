/**
 * Operator Snapshots Page
 * 
 * OPERATOR INTERFACE: Internal Read-Only Operator Dashboard
 * 
 * Purpose: "What happened today?"
 * 
 * Displays:
 * - Daily snapshots
 * - PnL
 * - Regime distribution
 * - Attribution summary
 * - Replay link (read-only)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface DailySnapshot {
  snapshotId: string;
  date: string;
  timestamp: string;
  systemMode: string;
  riskState: string;
  totalSystemEquity: number;
  directionalPoolEquity: number;
  arbitragePoolEquity: number;
  systemDrawdown: number;
  tradesAttempted: number;
  tradesBlocked: number;
  tradesExecuted: number;
  regimeDistribution: {
    FAVORABLE: number;
    UNFAVORABLE: number;
    UNKNOWN: number;
  };
  blockingReasons: {
    CAPITAL: number;
    REGIME: number;
    PERMISSION: number;
    RISK: number;
  };
}

export default function OperatorSnapshots() {
  const router = useRouter();
  const { date } = router.query;
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DailySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    try {
      let url = '/api/observability/snapshots';
      
      // If specific date requested, fetch that snapshot
      if (date && typeof date === 'string') {
        url += `?date=${date}`;
      } else {
        // Fetch last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        url += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        if (data.snapshot) {
          // Single snapshot
          setSnapshots([data.snapshot]);
          setSelectedSnapshot(data.snapshot);
        } else if (data.snapshots) {
          // Multiple snapshots
          setSnapshots(data.snapshots);
          if (data.snapshots.length > 0) {
            setSelectedSnapshot(data.snapshots[data.snapshots.length - 1]);
          }
        } else {
          setSnapshots([]);
        }
      } else {
        setError(data.error || 'Failed to fetch snapshots');
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch snapshots:', err);
      setError(err.message || 'Failed to fetch snapshots');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [date]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-gray-600">Loading snapshots...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Snapshots</h1>
          <p className="text-gray-600">Immutable daily performance records</p>
        </div>

        {/* Navigation */}
        <nav className="mb-8 flex space-x-4 border-b border-gray-200 pb-4">
          <Link href="/operator/overview" className="text-gray-600 hover:text-gray-900">
            Overview
          </Link>
          <Link href="/operator/accounts" className="text-gray-600 hover:text-gray-900">
            Accounts
          </Link>
          <Link href="/operator/snapshots" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">
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

        {/* Snapshots List */}
        {snapshots.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No snapshots found</p>
            <p className="text-gray-400 text-sm mt-2">
              Snapshots are generated at the end of each trading day.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Snapshot List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Snapshots</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {snapshots.slice().reverse().map((snapshot) => (
                    <button
                      key={snapshot.snapshotId}
                      onClick={() => setSelectedSnapshot(snapshot)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedSnapshot?.snapshotId === snapshot.snapshotId
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{snapshot.date}</p>
                      <p className="text-sm text-gray-500">
                        Equity: ${snapshot.totalSystemEquity.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Snapshot Details */}
            {selectedSnapshot && (
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedSnapshot.date}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(selectedSnapshot.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/operator/replay?date=${selectedSnapshot.date}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Replay day →
                    </Link>
                  </div>

                  {/* System State */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">System Mode</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedSnapshot.systemMode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Risk State</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedSnapshot.riskState}</p>
                    </div>
                  </div>

                  {/* Equity Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Total Equity</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${selectedSnapshot.totalSystemEquity.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Directional Pool</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${selectedSnapshot.directionalPoolEquity.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Arbitrage Pool</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${selectedSnapshot.arbitragePoolEquity.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Drawdown */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2">System Drawdown</p>
                    <p className={`text-2xl font-bold ${
                      selectedSnapshot.systemDrawdown > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {selectedSnapshot.systemDrawdown.toFixed(2)}%
                    </p>
                  </div>

                  {/* Trade Statistics */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Attempted</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedSnapshot.tradesAttempted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Executed</p>
                      <p className="text-lg font-semibold text-green-600">{selectedSnapshot.tradesExecuted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Blocked</p>
                      <p className="text-lg font-semibold text-red-600">{selectedSnapshot.tradesBlocked}</p>
                    </div>
                  </div>

                  {/* Regime Distribution */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Regime Distribution</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">FAVORABLE</p>
                        <p className="text-lg font-semibold text-green-700">
                          {selectedSnapshot.regimeDistribution.FAVORABLE}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">UNFAVORABLE</p>
                        <p className="text-lg font-semibold text-red-700">
                          {selectedSnapshot.regimeDistribution.UNFAVORABLE}
                        </p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">UNKNOWN</p>
                        <p className="text-lg font-semibold text-yellow-700">
                          {selectedSnapshot.regimeDistribution.UNKNOWN}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Blocking Reasons */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Blocking Reasons</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">CAPITAL</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedSnapshot.blockingReasons.CAPITAL}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">REGIME</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedSnapshot.blockingReasons.REGIME}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">PERMISSION</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedSnapshot.blockingReasons.PERMISSION}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">RISK</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedSnapshot.blockingReasons.RISK}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

