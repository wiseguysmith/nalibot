/**
 * Validation Status API
 * 
 * VALIDATION MODE: Returns current validation status for operator visibility.
 * 
 * Read-only endpoint that shows:
 * - Shadow trade count progress
 * - Runtime days progress
 * - Confidence score
 * - Confidence gate status
 * - Validation readiness
 */

import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationStatus {
  shadowTrades: number;
  requiredShadowTrades: number;
  runtimeDays: number;
  requiredRuntimeDays: number;
  confidenceScore: number;
  requiredConfidenceScore: number;
  allRegimesCovered: boolean;
  noUnsafeCombinations: boolean;
  realExecutionAllowed: boolean;
  blockingReasons?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to get latest confidence report
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return res.status(503).json({
        success: false,
        error: 'Validation not started',
        message: 'Run validation mode to start accumulating shadow trades'
      });
    }

    // Find latest confidence report
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('confidence-report-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'No confidence reports found',
        message: 'Run validation mode to generate confidence reports'
      });
    }

    const latestReportPath = path.join(reportsDir, files[0]);
    const reportData = JSON.parse(fs.readFileSync(latestReportPath, 'utf-8'));

    // Extract validation status from report
    const status: ValidationStatus = {
      shadowTrades: reportData.coverage?.totalTrades || 0,
      requiredShadowTrades: 500,
      runtimeDays: reportData.runtimeMetrics?.activeTradingDays || 0,
      requiredRuntimeDays: 100,
      confidenceScore: reportData.confidence?.overallConfidenceScore || 0,
      requiredConfidenceScore: 90,
      allRegimesCovered: reportData.coverage?.allRegimesCovered || false,
      noUnsafeCombinations: (reportData.confidence?.unsafeCombinations?.length || 0) === 0,
      realExecutionAllowed: reportData.readiness?.verdict === 'READY',
      blockingReasons: reportData.readiness?.verdict !== 'READY' 
        ? reportData.readiness?.blockingFactors || []
        : undefined
    };

    return res.status(200).json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('[VALIDATION_STATUS_API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get validation status'
    });
  }
}
