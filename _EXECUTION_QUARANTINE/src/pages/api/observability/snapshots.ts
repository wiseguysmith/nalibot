/**
 * Read-Only Operator API: Daily Snapshots
 * 
 * PHASE 4: Observability, Attribution & Replay
 * 
 * Exposes daily immutable snapshots for operator viewing.
 * READ-ONLY - No execution, no writes, no governance bypass.
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
    const { date, startDate, endDate } = req.query;
    const governance = getGovernanceInstance();

    if (!governance.snapshotGenerator) {
      return res.status(503).json({
        error: 'Observability not enabled',
        message: 'Snapshot generator is not available'
      });
    }

    // Get snapshot for specific date
    if (date && typeof date === 'string') {
      const snapshot = governance.snapshotGenerator.getSnapshot(date);
      
      if (!snapshot) {
        return res.status(404).json({
          error: 'Snapshot not found',
          date
        });
      }

      return res.status(200).json({
        success: true,
        snapshot: {
          ...snapshot,
          strategyPnL: Object.fromEntries(snapshot.strategyPnL),
          strategyDrawdowns: Object.fromEntries(snapshot.strategyDrawdowns),
          capitalAllocation: Object.fromEntries(snapshot.capitalAllocation),
          eventTypes: Object.fromEntries(snapshot.eventTypes)
        }
      });
    }

    // Get snapshots in date range
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const snapshots = governance.snapshotGenerator.getSnapshotsInRange(startDate, endDate);
      
      return res.status(200).json({
        success: true,
        snapshots: snapshots.map(s => ({
          ...s,
          strategyPnL: Object.fromEntries(s.strategyPnL),
          strategyDrawdowns: Object.fromEntries(s.strategyDrawdowns),
          capitalAllocation: Object.fromEntries(s.capitalAllocation),
          eventTypes: Object.fromEntries(s.eventTypes)
        }))
      });
    }

    // Get most recent snapshot
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
        eventTypes: Object.fromEntries(mostRecent.eventTypes)
      }
    });

  } catch (error: any) {
    console.error('Snapshots API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch snapshots',
      details: error.message
    });
  }
}

