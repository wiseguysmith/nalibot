/**
 * Read-Only Operator Status Endpoint
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Exposes detailed system status.
 * READ-ONLY - No execution, no adapters, no state mutation.
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../lib/governance_instance';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed - read-only API' });
  }

  try {
    const governance = getGovernanceInstance();
    const status = governance.getStatus();

    // Get current regime if available
    let currentRegime = null;
    if (governance.regimeDetector) {
      // Get regime for a default symbol (or first available)
      currentRegime = governance.regimeDetector.getCurrentRegime('BTC/USD');
    }

    return res.status(200).json({
      success: true,
      status: {
        ...status,
        currentRegime: currentRegime ? {
          regime: currentRegime.regime,
          confidence: currentRegime.confidence
        } : null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Status API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch status',
      details: error.message
    });
  }
}

