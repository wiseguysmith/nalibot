/**
 * Operator Accounts Page
 * 
 * OPERATOR INTERFACE: Internal Read-Only Operator Dashboard
 * 
 * Purpose: "How are all accounts doing?"
 * 
 * Displays:
 * - Account ID
 * - Equity
 * - Drawdown
 * - Risk state
 * - Enabled strategies
 * - Lifecycle state
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AccountSummary {
  accountId: string;
  displayName: string;
  state: string;
  equity: number;
  pnl: number;
  drawdown: number;
  enabledStrategies: string[];
  capitalMetrics: {
    startingCapital: number;
    currentEquity: number;
    directionalPool: any;
    arbitragePool: any;
  };
}

export default function OperatorAccounts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts || []);
      } else {
        setError(data.error || 'Failed to fetch accounts');
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch accounts:', err);
      setError(err.message || 'Failed to fetch accounts');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // Refresh every 60 seconds (calm refresh rate)
    const interval = setInterval(fetchAccounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE': return 'text-green-600 bg-green-50';
      case 'PROBATION': return 'text-yellow-600 bg-yellow-50';
      case 'OBSERVE_ONLY': return 'text-blue-600 bg-blue-50';
      case 'SHUTDOWN': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDrawdownColor = (drawdown: number) => {
    if (drawdown === 0) return 'text-gray-600';
    if (drawdown < 5) return 'text-yellow-600';
    if (drawdown < 15) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-gray-600">Loading accounts...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Accounts</h1>
          <p className="text-gray-600">Account status and performance overview</p>
        </div>

        {/* Navigation */}
        <nav className="mb-8 flex space-x-4 border-b border-gray-200 pb-4">
          <Link href="/operator/overview" className="text-gray-600 hover:text-gray-900">
            Overview
          </Link>
          <Link href="/operator/accounts" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">
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

        {/* Accounts Table */}
        {accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No accounts found</p>
            <p className="text-gray-400 text-sm mt-2">
              Account abstraction may not be enabled, or no accounts have been created yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drawdown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strategies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.accountId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{account.displayName}</div>
                        <div className="text-sm text-gray-500">{account.accountId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStateColor(account.state)}`}>
                        {account.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${account.equity.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      account.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {account.pnl >= 0 ? '+' : ''}${account.pnl.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getDrawdownColor(account.drawdown)}`}>
                      {account.drawdown.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.enabledStrategies.length > 0 ? (
                        <span>{account.enabledStrategies.length} enabled</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/operator/account/${account.accountId}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        {accounts.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Equity</p>
              <p className="text-2xl font-bold text-gray-900">
                ${accounts.reduce((sum, a) => sum + a.equity, 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total P&L</p>
              <p className={`text-2xl font-bold ${
                accounts.reduce((sum, a) => sum + a.pnl, 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${accounts.reduce((sum, a) => sum + a.pnl, 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Active Accounts</p>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.state === 'ACTIVE').length}
              </p>
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

