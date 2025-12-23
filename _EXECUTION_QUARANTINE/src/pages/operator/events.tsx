/**
 * Operator Events Page
 * 
 * OPERATOR INTERFACE: Internal Read-Only Operator Dashboard
 * 
 * Purpose: "Did anything abnormal happen?"
 * 
 * Displays:
 * - Shutdowns
 * - Probation
 * - Recovery
 * - Integrity issues
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface Event {
  eventId: string;
  timestamp: string;
  eventType: string;
  accountId?: string;
  strategyId?: string;
  reason: string;
  metadata?: Record<string, any>;
  executionType?: 'SIMULATED' | 'REAL' | 'SHADOW' | 'SENTINEL';
}

export default function OperatorEvents() {
  const router = useRouter();
  const { accountId, eventType, startDate, endDate } = router.query;
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    eventType: eventType as string || '',
    accountId: accountId as string || '',
    startDate: startDate as string || '',
    endDate: endDate as string || '',
    executionType: '' as string
  });

  const fetchEvents = async () => {
    try {
      let url = '/api/observability/events?limit=100';
      
      if (filters.eventType) {
        url += `&eventType=${filters.eventType}`;
      }
      if (filters.accountId) {
        url += `&accountId=${filters.accountId}`;
      }
      if (filters.startDate) {
        url += `&startDate=${filters.startDate}`;
      }
      if (filters.endDate) {
        url += `&endDate=${filters.endDate}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Filter for abnormal events (shutdowns, probation, recovery, integrity)
        const abnormalEvents = data.events.filter((e: Event) => 
          e.eventType === 'SYSTEM_MODE_CHANGE' ||
          e.eventType === 'STRATEGY_STATE_CHANGE' ||
          e.eventType === 'TRADE_BLOCKED' ||
          e.eventType === 'RISK_BUDGET_DECAY' ||
          e.eventType === 'RISK_BUDGET_RECOVERY' ||
          e.reason.toLowerCase().includes('shutdown') ||
          e.reason.toLowerCase().includes('probation') ||
          e.reason.toLowerCase().includes('recovery') ||
          e.reason.toLowerCase().includes('integrity') ||
          e.reason.toLowerCase().includes('violation')
        );

        setEvents(abnormalEvents.length > 0 ? abnormalEvents : data.events.slice(0, 50));
      } else {
        setError(data.error || 'Failed to fetch events');
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError(err.message || 'Failed to fetch events');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('SHUTDOWN') || eventType.includes('BLOCKED')) {
      return 'text-red-600 bg-red-50';
    }
    if (eventType.includes('PROBATION') || eventType.includes('DECAY')) {
      return 'text-yellow-600 bg-yellow-50';
    }
    if (eventType.includes('RECOVERY')) {
      return 'text-green-600 bg-green-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const getExecutionTypeColor = (executionType?: string) => {
    switch (executionType) {
      case 'SIMULATED': return 'text-blue-600 bg-blue-50';
      case 'REAL': return 'text-green-600 bg-green-50';
      case 'SHADOW': return 'text-gray-600 bg-gray-50';
      case 'SENTINEL': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-400 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">Abnormal events and system changes</p>
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
          <Link href="/operator/events" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">
            Events
          </Link>
          <Link href="/operator/confidence" className="text-gray-600 hover:text-gray-900">
            Confidence
          </Link>
          <Link href="/operator/simulation" className="text-gray-600 hover:text-gray-900">
            Simulation
          </Link>
        </nav>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="TRADE_EXECUTED">Trade Executed</option>
                <option value="SYSTEM_MODE_CHANGE">System Mode Change</option>
                <option value="STRATEGY_STATE_CHANGE">Strategy State Change</option>
                <option value="TRADE_BLOCKED">Trade Blocked</option>
                <option value="RISK_BUDGET_DECAY">Risk Budget Decay</option>
                <option value="RISK_BUDGET_RECOVERY">Risk Budget Recovery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Execution Type</label>
              <select
                value={filters.executionType}
                onChange={(e) => setFilters({ ...filters, executionType: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="SIMULATED">SIMULATED</option>
                <option value="REAL">REAL</option>
                <option value="SHADOW">SHADOW</option>
                <option value="SENTINEL">SENTINEL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => {
                  setFilters({ 
                    eventType: 'TRADE_EXECUTED', 
                    executionType: 'SIMULATED', 
                    accountId: '', 
                    startDate: '', 
                    endDate: '' 
                  });
                }}
                className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                SIM Trades
              </button>
              <button
                onClick={() => setFilters({ eventType: '', executionType: '', accountId: '', startDate: '', endDate: '' })}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Events List */}
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No events found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filters.executionType || filters.eventType === 'TRADE_EXECUTED' 
                ? 'No events match the current filters.'
                : 'This is good - no abnormal events means the system is operating normally.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {events.map((event) => (
                <div key={event.eventId} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.eventType)}`}>
                          {event.eventType}
                        </span>
                        {event.executionType && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getExecutionTypeColor(event.executionType)}`}>
                            {event.executionType}
                          </span>
                        )}
                        {event.accountId && (
                          <span className="text-xs text-gray-500">
                            Account: {event.accountId}
                          </span>
                        )}
                        {event.strategyId && (
                          <span className="text-xs text-gray-500">
                            Strategy: {event.strategyId}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 font-medium mb-1">{event.reason}</p>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          {JSON.stringify(event.metadata, null, 2)}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Read-only operator interface • Showing {events.length} events • Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

