/**
 * Read-Only Operator Last Snapshot Endpoint
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Exposes most recent snapshot.
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

    if (!governance.snapshotGenerator) {
      return res.status(503).json({
        error: 'Observability not enabled',
        message: 'Snapshot generator is not available'
      });
    }

    const allSnapshots = governance.snapshotGenerator.getAllSnapshots();
    const mostRecent = allSnapshots.length > 0 
      ? allSnapshots[allSnapshots.length - 1]
      : null;

    if (!mostRecent) {
      return res.status(404).json({
        error: 'No snapshots available',
        message: 'No snapshots have been generated yet'
      });
    }

    return res.status(200).json({
      success: true,
      snapshot: {
        ...mostRecent,
        strategyPnL: Object.fromEntries(mostRecent.strategyPnL),
        strategyDrawdowns: Object.fromEntries(mostRecent.strategyDrawdowns),
        capitalAllocation: Object.fromEntries(mostRecent.capitalAllocation),
        eventTypes: Object.fromEntries(mostRecent.eventTypes),
        timestamp: mostRecent.timestamp.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Last snapshot API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch last snapshot',
      details: error.message
    });
  }
}

