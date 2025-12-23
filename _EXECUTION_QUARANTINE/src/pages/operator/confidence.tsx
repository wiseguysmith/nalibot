/**
 * Operator Confidence Page
 * 
 * OPERATOR INTERFACE: Internal Read-Only Operator Dashboard
 * 
 * Purpose: "Are we ready for live trading?"
 * 
 * Displays:
 * - Overall confidence score (0-100)
 * - Trade count and regime coverage
 * - Fill match %, price error, slippage delta
 * - Readiness verdict (GREEN/YELLOW/RED)
 * - Missing requirements
 * - Unsafe combinations
 * 
 * Design: Calm, read-only, operator-focused
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface RegimeCoverage {
  regime: string;
  totalTrades: number;
  tradesWithMetrics: number;
  minimumRequired: number;
  coveragePercentage: number;
  isCovered: boolean;
  firstTradeTimestamp?: string;
  lastTradeTimestamp?: string;
}

interface CoverageSummary {
  totalTrades: number;
  coverageByRegime: Record<string, RegimeCoverage>;
  allRegimesCovered: boolean;
  overallCoveragePercentage: number;
  minimumRequiredPerRegime: number;
}

interface StrategyConfidenceMetrics {
  strategyId: string;
  totalTrades: number;
  tradesWithMetrics: number;
  averageConfidenceScore: number;
  worstCaseConfidenceScore: number;
  confidenceScoreStdDev: number;
  isConfident: boolean;
}

interface RegimeConfidenceMetrics {
  regime: string;
  totalTrades: number;
  tradesWithMetrics: number;
  averageConfidenceScore: number;
  worstCaseConfidenceScore: number;
  confidenceScoreStdDev: number;
  isConfident: boolean;
}

interface UnsafeCombination {
  strategyId: string;
  regime: string;
  totalTrades: number;
  tradesWithMetrics: number;
  averageConfidenceScore: number;
  worstCaseConfidenceScore: number;
  confidenceScoreStdDev: number;
  isConfident: boolean;
  isUnsafe: boolean;
  unsafeReason?: string;
}

interface ConfidenceAnalysis {
  strategies: Record<string, StrategyConfidenceMetrics>;
  regimes: Record<string, RegimeConfidenceMetrics>;
  combinations: Record<string, any>;
  unsafeCombinations: UnsafeCombination[];
  overallConfidenceScore: number;
}

interface ConfidenceTrend {
  period: {
    start: string;
    end: string;
    durationDays: number;
  };
  trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  trendStrength: number;
  averageConfidence: number;
  confidenceChange: number;
  confidenceChangePct: number;
}

interface TrendAnalysis {
  currentTrend: ConfidenceTrend;
  recentTrends: ConfidenceTrend[];
  overallTrend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  trendConfidence: number;
}

interface ConfidenceReport {
  generatedAt: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  coverage: CoverageSummary;
  confidence: ConfidenceAnalysis;
  trends: TrendAnalysis;
  overallConfidence: number;
  isReadyForLiveTrading: boolean;
  readinessFactors: {
    coverageMet: boolean;
    confidenceMet: boolean;
    noUnsafeCombinations: boolean;
    trendStable: boolean;
  };
  recommendations: string[];
  warnings: string[];
}

interface ParitySummary {
  generatedAt: string;
  totalTrades: number;
  observationWindowMs: number;
  fillMatch: {
    total: number;
    matched: number;
    matchPercentage: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  priceError: {
    average: number;
    averagePct: number;
    worstCase: number;
    worstCasePct: number;
    standardDeviation: number;
  };
  slippage: {
    averageError: number;
    averageErrorPct: number;
    worstCase: number;
    worstCasePct: number;
  };
  confidenceScore: number;
}

export default function OperatorConfidence() {
  const [report, setReport] = useState<ConfidenceReport | null>(null);
  const [paritySummary, setParitySummary] = useState<ParitySummary | null>(null);
  const [validationStatus, setValidationStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const fetchConfidenceReport = async (date?: string) => {
    try {
      let url = '/api/observability/confidence-report';
      if (date) {
        url += `?date=${date}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.report) {
        setReport(data.report);
        if (data.availableDates) {
          setAvailableDates(data.availableDates);
        }
        if (data.mostRecent) {
          setSelectedDate(data.mostRecent);
        }
        setError(null);
      } else {
        setError(data.error || data.message || 'Failed to fetch confidence report');
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch confidence report:', err);
      setError(err.message || 'Failed to fetch confidence report');
      setIsLoading(false);
    }
  };

  const fetchParitySummary = async () => {
    try {
      const response = await fetch('/api/observability/parity-summary');
      const data = await response.json();

      // Parity summary may not be available (returns 503 when shadow mode not active)
      if (data.success && data.summary) {
        setParitySummary(data.summary);
      } else if (response.status === 503) {
        // Shadow mode not active - this is expected and not an error
        setParitySummary(null);
      }
    } catch (err: any) {
      // Silently fail - parity summary is optional
      console.debug('Parity summary not available:', err.message);
      setParitySummary(null);
    }
  };

  useEffect(() => {
    fetchConfidenceReport();
    fetchParitySummary(); // Fetch parity summary if available
    fetchValidationStatus(); // Fetch validation status if available
    // Refresh every 60 seconds (calm refresh rate)
    const interval = setInterval(() => {
      fetchConfidenceReport(selectedDate || undefined);
      fetchParitySummary();
      fetchValidationStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // Determine readiness verdict color
  const getReadinessColor = (): 'green' | 'yellow' | 'red' => {
    if (!report) return 'red';
    
    // GREEN: All factors met and confidence >= 90%
    if (report.isReadyForLiveTrading && report.overallConfidence >= 90) {
      return 'green';
    }
    
    // YELLOW: Some factors met or confidence 60-89%
    if (report.overallConfidence >= 60 && report.overallConfidence < 90) {
      return 'yellow';
    }
    
    // RED: Confidence < 60% or critical factors missing
    return 'red';
  };

  // Get confidence color based on score
  const getConfidenceColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get regime color
  const getRegimeColor = (regime: string): string => {
    switch (regime) {
      case 'FAVORABLE': return 'text-green-600';
      case 'UNFAVORABLE': return 'text-red-600';
      case 'UNKNOWN': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Get trend color
  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'IMPROVING': return 'text-green-600';
      case 'DEGRADING': return 'text-red-600';
      case 'STABLE': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-gray-600">Loading confidence report...</p>
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
            {error.includes('No confidence reports found') && (
              <p className="text-sm text-gray-600 mt-4">
                Confidence reports are generated by running the accumulation script:
                <code className="ml-2 bg-gray-100 px-2 py-1 rounded">npm run confidence-accumulation</code>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-yellow-800 font-semibold mb-2">No Report Available</h2>
            <p className="text-yellow-600">No confidence report data found. Run the accumulation script to generate reports.</p>
          </div>
        </div>
      </div>
    );
  }

  const readinessColor = getReadinessColor();
  const readinessBgColor = readinessColor === 'green' ? 'bg-green-50 border-green-200' : 
                           readinessColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 
                           'bg-red-50 border-red-200';
  const readinessTextColor = readinessColor === 'green' ? 'text-green-800' : 
                            readinessColor === 'yellow' ? 'text-yellow-800' : 
                            'text-red-800';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Confidence & Readiness</h1>
          <p className="text-gray-600">Execution confidence assessment and readiness for live trading</p>
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
          <Link href="/operator/confidence" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-2">
            Confidence
          </Link>
          <Link href="/operator/simulation" className="text-gray-600 hover:text-gray-900">
            Simulation
          </Link>
        </nav>

        {/* Date Selector */}
        {availableDates.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <label className="text-sm font-medium text-gray-700 mr-4">Report Date:</label>
            <select
              value={selectedDate || ''}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchConfidenceReport(e.target.value);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500 ml-4">
              Report generated: {new Date(report.generatedAt).toLocaleString()}
            </span>
          </div>
        )}

        {/* Readiness Verdict Card */}
        {/* 
          Readiness Verdict: Overall assessment of whether system is ready for live trading.
          GREEN: All factors met (coverage, confidence >= 90%, no unsafe combos, stable trend)
          YELLOW: Some factors met or confidence 60-89%
          RED: Confidence < 60% or critical factors missing
        */}
        <div className={`mb-8 rounded-lg shadow-sm border-2 p-6 ${readinessBgColor}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Readiness Verdict</h2>
            <span className={`text-3xl font-bold ${readinessTextColor}`}>
              {readinessColor === 'green' ? '✓ READY' : readinessColor === 'yellow' ? '⚠ CAUTION' : '✗ NOT READY'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Confidence Score */}
            {/* 
              Overall Confidence Score: Weighted average of execution accuracy across all shadow trades.
              Calculated from fill match (40%), price error (30%), slippage error (20%), consistency (10%).
              Target: 90% minimum for live trading approval.
            */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Overall Confidence Score</p>
              <p className={`text-4xl font-bold ${getConfidenceColor(report.overallConfidence)}`}>
                {report.overallConfidence.toFixed(1)}/100
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Target: 90% • {report.overallConfidence >= 90 ? '✓ Met' : `Need ${(90 - report.overallConfidence).toFixed(1)}% more`}
              </p>
            </div>

            {/* Ready for Live Trading */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Ready for Live Trading</p>
              <p className={`text-2xl font-bold ${report.isReadyForLiveTrading ? 'text-green-600' : 'text-red-600'}`}>
                {report.isReadyForLiveTrading ? 'YES' : 'NO'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                All readiness factors must be met
              </p>
            </div>
          </div>

          {/* Readiness Factors */}
          <div className="mt-6 pt-6 border-t border-gray-300">
            <p className="text-sm font-medium text-gray-700 mb-3">Readiness Factors:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <span className={`text-xl mr-2 ${report.readinessFactors.coverageMet ? 'text-green-600' : 'text-red-600'}`}>
                  {report.readinessFactors.coverageMet ? '✓' : '✗'}
                </span>
                <span className="text-sm text-gray-700">Coverage Met</span>
              </div>
              <div className="flex items-center">
                <span className={`text-xl mr-2 ${report.readinessFactors.confidenceMet ? 'text-green-600' : 'text-red-600'}`}>
                  {report.readinessFactors.confidenceMet ? '✓' : '✗'}
                </span>
                <span className="text-sm text-gray-700">Confidence Met</span>
              </div>
              <div className="flex items-center">
                <span className={`text-xl mr-2 ${report.readinessFactors.noUnsafeCombinations ? 'text-green-600' : 'text-red-600'}`}>
                  {report.readinessFactors.noUnsafeCombinations ? '✓' : '✗'}
                </span>
                <span className="text-sm text-gray-700">No Unsafe Combos</span>
              </div>
              <div className="flex items-center">
                <span className={`text-xl mr-2 ${report.readinessFactors.trendStable ? 'text-green-600' : 'text-red-600'}`}>
                  {report.readinessFactors.trendStable ? '✓' : '✗'}
                </span>
                <span className="text-sm text-gray-700">Trend Stable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Status Card */}
        {/* 
          VALIDATION MODE: Shows progress toward validation requirements.
          Requirements: Shadow trades ≥ 500, Runtime ≥ 100 days, Confidence ≥ 90%
          REAL execution is hard-blocked until all requirements are met.
        */}
        {validationStatus && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-blue-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Validation Status</h2>
            <p className="text-sm text-gray-600 mb-4">
              Progress toward validation requirements. REAL execution is blocked until all requirements are met.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Shadow Trades Progress */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Shadow Trades</p>
                <p className="text-2xl font-bold text-gray-900">
                  {validationStatus.shadowTrades} / {validationStatus.requiredShadowTrades}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      validationStatus.shadowTrades >= validationStatus.requiredShadowTrades ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (validationStatus.shadowTrades / validationStatus.requiredShadowTrades) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Runtime Days Progress */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Runtime Days</p>
                <p className="text-2xl font-bold text-gray-900">
                  {validationStatus.runtimeDays.toFixed(1)} / {validationStatus.requiredRuntimeDays}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      validationStatus.runtimeDays >= validationStatus.requiredRuntimeDays ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (validationStatus.runtimeDays / validationStatus.requiredRuntimeDays) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Confidence Score Progress */}
              <div>
                <p className="text-sm text-gray-600 mb-1">Confidence Score</p>
                <p className={`text-2xl font-bold ${getConfidenceColor(validationStatus.confidenceScore)}`}>
                  {validationStatus.confidenceScore.toFixed(1)}% / {validationStatus.requiredConfidenceScore}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      validationStatus.confidenceScore >= validationStatus.requiredConfidenceScore ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (validationStatus.confidenceScore / validationStatus.requiredConfidenceScore) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* REAL Execution Status */}
            <div className={`mt-4 p-4 rounded-lg ${
              validationStatus.realExecutionAllowed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">REAL Execution Allowed:</span>
                <span className={`text-xl font-bold ${
                  validationStatus.realExecutionAllowed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validationStatus.realExecutionAllowed ? '✅ YES' : '❌ NO'}
                </span>
              </div>
              {!validationStatus.realExecutionAllowed && validationStatus.blockingReasons && (
                <div className="mt-2 text-sm text-gray-700">
                  <p className="font-medium mb-1">Blocking Reasons:</p>
                  <ul className="list-disc list-inside">
                    {validationStatus.blockingReasons.map((reason: string, idx: number) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regime Coverage Card */}
        {/* 
          Regime Coverage: Tracks shadow trades across all market regimes (FAVORABLE, UNFAVORABLE, UNKNOWN).
          Each regime needs minimum trades (default: 167) to ensure sufficient data for confidence assessment.
          Coverage percentage = (trades with metrics / minimum required) * 100
        */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Regime Coverage</h2>
          <p className="text-sm text-gray-600 mb-4">
            Shadow trades accumulated across all market regimes. Each regime needs {report.coverage.minimumRequiredPerRegime} trades minimum.
          </p>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Total Shadow Trades</span>
              <span className="text-lg font-bold text-gray-900">{report.coverage.totalTrades}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Overall Coverage</span>
              <span className={`text-lg font-bold ${report.coverage.allRegimesCovered ? 'text-green-600' : 'text-yellow-600'}`}>
                {report.coverage.overallCoveragePercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Coverage by Regime */}
          <div className="space-y-4">
            {Object.entries(report.coverage.coverageByRegime).map(([regime, coverage]) => (
              <div key={regime} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${getRegimeColor(regime)}`}>
                    {regime}
                  </span>
                  <span className={`text-sm font-semibold ${coverage.isCovered ? 'text-green-600' : 'text-red-600'}`}>
                    {coverage.isCovered ? '✓ Covered' : '✗ Not Covered'}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                  <div
                    className={`h-4 rounded-full ${
                      coverage.isCovered ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${Math.min(100, coverage.coveragePercentage)}%`
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Trades: {coverage.tradesWithMetrics}/{coverage.minimumRequired}
                  </span>
                  <span>
                    {coverage.coveragePercentage.toFixed(1)}% coverage
                  </span>
                </div>
                
                {coverage.firstTradeTimestamp && (
                  <p className="text-xs text-gray-500 mt-2">
                    First: {new Date(coverage.firstTradeTimestamp).toLocaleDateString()} • 
                    Last: {coverage.lastTradeTimestamp ? new Date(coverage.lastTradeTimestamp).toLocaleDateString() : 'N/A'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Metrics Card */}
        {/* 
          Confidence Metrics: Execution accuracy scores broken down by strategy and regime.
          Average Confidence: Mean confidence score across all trades
          Worst Case: Lowest confidence score (indicates risk level)
          Std Dev: Standard deviation (lower = more consistent)
          Is Confident: >= 90% threshold
        */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Confidence Metrics</h2>
          <p className="text-sm text-gray-600 mb-4">
            Execution confidence scores by strategy and regime. Higher scores indicate better execution accuracy.
          </p>

          {/* Confidence by Strategy */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">By Strategy</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Confidence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worst Case</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Std Dev</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trades</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(report.confidence.strategies).map(([strategyId, metrics]) => (
                    <tr key={strategyId}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{strategyId}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${getConfidenceColor(metrics.averageConfidenceScore)}`}>
                        {metrics.averageConfidenceScore.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-3 text-sm ${getConfidenceColor(metrics.worstCaseConfidenceScore)}`}>
                        {metrics.worstCaseConfidenceScore.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {metrics.confidenceScoreStdDev.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {metrics.tradesWithMetrics}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={metrics.isConfident ? 'text-green-600' : 'text-red-600'}>
                          {metrics.isConfident ? '✓ Confident' : '✗ Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confidence by Regime */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">By Regime</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regime</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Confidence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worst Case</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trades</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(report.confidence.regimes).map(([regime, metrics]) => (
                    <tr key={regime}>
                      <td className={`px-4 py-3 text-sm font-medium ${getRegimeColor(regime)}`}>
                        {regime}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${getConfidenceColor(metrics.averageConfidenceScore)}`}>
                        {metrics.averageConfidenceScore.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-3 text-sm ${getConfidenceColor(metrics.worstCaseConfidenceScore)}`}>
                        {metrics.worstCaseConfidenceScore.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {metrics.tradesWithMetrics}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={metrics.isConfident ? 'text-green-600' : 'text-red-600'}>
                          {metrics.isConfident ? '✓ Confident' : '✗ Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Parity Metrics Card */}
        {/* 
          Parity Metrics: Detailed execution accuracy metrics from shadow trading.
          Fill Match %: Percentage of trades where simulated fill matched observed fill
          Price Error: Difference between simulated execution price and observed market price
          Slippage Delta: Difference between simulated slippage and observed slippage
          These metrics validate that our simulation accurately predicts real execution.
        */}
        {paritySummary && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Parity Metrics</h2>
            <p className="text-sm text-gray-600 mb-4">
              Detailed execution accuracy metrics comparing simulated vs observed execution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Fill Match */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Fill Match Percentage</p>
                <p className={`text-3xl font-bold ${getConfidenceColor(paritySummary.fillMatch.matchPercentage * 100)}`}>
                  {paritySummary.fillMatch.matchPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {paritySummary.fillMatch.matched}/{paritySummary.fillMatch.total} trades matched
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Confidence: {paritySummary.fillMatch.confidence}
                </p>
              </div>

              {/* Price Error */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Average Price Error</p>
                <p className={`text-3xl font-bold ${Math.abs(paritySummary.priceError.averagePct) < 1 ? 'text-green-600' : Math.abs(paritySummary.priceError.averagePct) < 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {paritySummary.priceError.averagePct.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ${Math.abs(paritySummary.priceError.average).toFixed(2)} absolute
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Worst: {paritySummary.priceError.worstCasePct.toFixed(2)}%
                </p>
              </div>

              {/* Slippage Delta */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Slippage Error</p>
                <p className={`text-3xl font-bold ${Math.abs(paritySummary.slippage.averageErrorPct) < 2 ? 'text-green-600' : Math.abs(paritySummary.slippage.averageErrorPct) < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {paritySummary.slippage.averageErrorPct.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Average slippage delta
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Worst: {paritySummary.slippage.worstCasePct.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Parity metrics are only available when shadow mode is active. 
                These metrics validate execution simulation accuracy.
              </p>
            </div>
          </div>
        )}

        {/* Trend Analysis Card */}
        {/* 
          Confidence Trends: Tracks how confidence changes over time using rolling windows (default: 7 days).
          IMPROVING: Confidence increasing (> 2% change)
          STABLE: Confidence stable (±2% change)
          DEGRADING: Confidence decreasing (< -2% change) - requires investigation
          Trend Confidence: How confident we are in the trend direction (0-100%)
        */}
        {report.trends && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confidence Trends</h2>
            <p className="text-sm text-gray-600 mb-4">
              How confidence is changing over time. IMPROVING is good, DEGRADING requires investigation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Overall Trend</p>
                <p className={`text-xl font-bold ${getTrendColor(report.trends.overallTrend)}`}>
                  {report.trends.overallTrend}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Trend Confidence</p>
                <p className="text-xl font-bold text-gray-900">
                  {(report.trends.trendConfidence * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Window</p>
                <p className="text-xl font-bold text-gray-900">
                  {report.trends.currentTrend.period.durationDays.toFixed(1)} days
                </p>
              </div>
            </div>

            {report.trends.currentTrend && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Average Confidence</p>
                    <p className={`text-lg font-semibold ${getConfidenceColor(report.trends.currentTrend.averageConfidence)}`}>
                      {report.trends.currentTrend.averageConfidence.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Change</p>
                    <p className={`text-lg font-semibold ${
                      report.trends.currentTrend.confidenceChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {report.trends.currentTrend.confidenceChange >= 0 ? '+' : ''}
                      {report.trends.currentTrend.confidenceChange.toFixed(1)}% 
                      ({report.trends.currentTrend.confidenceChangePct >= 0 ? '+' : ''}
                      {report.trends.currentTrend.confidenceChangePct.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unsafe Combinations Alert */}
        {/* 
          Unsafe Combinations: Strategy×regime combinations flagged as unsafe based on deterministic rules:
          1. Average confidence < 90% AND has minimum trades
          2. Worst case confidence < 60% (too risky even if average is good)
          3. High variance (std dev > 20) AND average < 95% (inconsistent)
          4. Insufficient trades (< 10 minimum)
          These MUST be addressed before live trading.
        */}
        {report.confidence.unsafeCombinations.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-red-900 mb-4">
              ⚠️ Unsafe Strategy × Regime Combinations
            </h2>
            <p className="text-sm text-red-700 mb-4">
              These combinations have been flagged as unsafe and must be addressed before live trading.
            </p>

            <div className="space-y-3">
              {report.confidence.unsafeCombinations.map((combo, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-red-900">
                      {combo.strategyId} × {combo.regime}
                    </span>
                    <span className="text-sm text-red-600">
                      {combo.tradesWithMetrics} trades
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-xs text-gray-500">Average Confidence</p>
                      <p className={`text-sm font-semibold ${getConfidenceColor(combo.averageConfidenceScore)}`}>
                        {combo.averageConfidenceScore.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Worst Case</p>
                      <p className={`text-sm font-semibold ${getConfidenceColor(combo.worstCaseConfidenceScore)}`}>
                        {combo.worstCaseConfidenceScore.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {combo.unsafeReason && (
                    <p className="text-xs text-red-700 mt-2">
                      <strong>Reason:</strong> {combo.unsafeReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations & Warnings */}
        {(report.recommendations.length > 0 || report.warnings.length > 0) && (
          <div className="space-y-4 mb-8">
            {report.recommendations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-3">💡 Recommendations</h2>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-800 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ Warnings</h2>
                <ul className="space-y-2">
                  {report.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-800 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Missing Requirements */}
        {!report.isReadyForLiveTrading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Missing Requirements</h2>
            <ul className="space-y-2">
              {!report.readinessFactors.coverageMet && (
                <li className="text-sm text-gray-700 flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>
                    <strong>Coverage:</strong> Need more shadow trades. 
                    {Object.entries(report.coverage.coverageByRegime)
                      .filter(([_, c]) => !c.isCovered)
                      .map(([regime, c]) => `${regime} (${c.tradesWithMetrics}/${c.minimumRequired})`)
                      .join(', ')}
                  </span>
                </li>
              )}
              {!report.readinessFactors.confidenceMet && (
                <li className="text-sm text-gray-700 flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>
                    <strong>Confidence:</strong> Overall confidence {report.overallConfidence.toFixed(1)}% is below 90% threshold. 
                    Need {(90 - report.overallConfidence).toFixed(1)}% improvement.
                  </span>
                </li>
              )}
              {!report.readinessFactors.noUnsafeCombinations && (
                <li className="text-sm text-gray-700 flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>
                    <strong>Unsafe Combinations:</strong> {report.confidence.unsafeCombinations.length} unsafe strategy×regime combination(s) must be addressed.
                  </span>
                </li>
              )}
              {!report.readinessFactors.trendStable && (
                <li className="text-sm text-gray-700 flex items-start">
                  <span className="text-red-600 mr-2">✗</span>
                  <span>
                    <strong>Trend:</strong> Confidence trend is degrading. Investigate root causes before proceeding.
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Read-only operator interface • Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-1 text-xs">
            Report period: {new Date(report.reportPeriod.start).toLocaleDateString()} to {new Date(report.reportPeriod.end).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
