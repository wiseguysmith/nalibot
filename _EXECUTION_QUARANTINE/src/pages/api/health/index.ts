/**
 * Read-Only Operator Health Endpoint
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Exposes system health status.
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
    const health = governance.getSystemHealth();

    if (!health) {
      return res.status(503).json({
        error: 'Health monitoring not enabled',
        message: 'Health monitor is not available'
      });
    }

    return res.status(200).json({
      success: true,
      health: {
        ...health,
        lastMarketDataUpdate: health.lastMarketDataUpdate?.toISOString() || null,
        lastEventLogWrite: health.lastEventLogWrite?.toISOString() || null,
        lastSnapshotWrite: health.lastSnapshotWrite?.toISOString() || null,
        timestamp: health.timestamp.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Health API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch health status',
      details: error.message
    });
  }
}

