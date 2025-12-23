/**
 * Read-Only Operator API: Replay
 * 
 * PHASE 4: Observability, Attribution & Replay
 * 
 * Exposes replay functionality for operator analysis.
 * READ-ONLY - No execution, no writes, no governance bypass.
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../lib/governance_instance';
import { ReplayEngine } from '../../../../core/replay/replay_engine';

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

    if (!governance.eventLog || !governance.snapshotGenerator) {
      return res.status(503).json({
        error: 'Observability not enabled',
        message: 'Replay engine requires event log and snapshot generator'
      });
    }

    const replayEngine = new ReplayEngine();

    // Replay specific day
    if (date && typeof date === 'string') {
      const snapshot = governance.snapshotGenerator.getSnapshot(date);
      const result = replayEngine.replayDay(
        date,
        governance.eventLog,
        snapshot
      );

      return res.status(200).json({
        success: true,
        result: {
          ...result,
          outcome: {
            ...result.outcome,
            finalState: {
              ...result.outcome.finalState
            }
          }
        }
      });
    }

    // Replay date range
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      // Build snapshots map
      const allSnapshots = governance.snapshotGenerator.getAllSnapshots();
      const snapshotsMap = new Map<string, any>();
      allSnapshots.forEach(s => {
        snapshotsMap.set(s.date, s);
      });

      const results = replayEngine.replayDays(
        startDate,
        endDate,
        governance.eventLog,
        snapshotsMap
      );

      return res.status(200).json({
        success: true,
        results: results.map(r => ({
          ...r,
          outcome: {
            ...r.outcome,
            finalState: {
              ...r.outcome.finalState
            }
          }
        }))
      });
    }

    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['date'] or ['startDate', 'endDate']
    });

  } catch (error: any) {
    console.error('Replay API error:', error);
    return res.status(500).json({
      error: 'Failed to replay',
      details: error.message
    });
  }
}

