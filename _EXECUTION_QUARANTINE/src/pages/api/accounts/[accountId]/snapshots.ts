/**
 * Read-Only Operator Account Snapshots API Route
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Read-only endpoint for account-scoped daily snapshots.
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../../../lib/governance_instance';

/**
 * GET /api/accounts/[accountId]/snapshots
 * 
 * Get daily snapshots for a specific account.
 * Filters global snapshots by accountId in events.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed - read-only API' });
  }

  try {
    const { accountId } = req.query;
    const { startDate, endDate } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'Invalid accountId' });
    }

    const governance = getGovernanceInstance();

    if (!governance.phase7AccountManager) {
      return res.status(503).json({
        error: 'Account abstraction not enabled',
        message: 'Account manager is not available'
      });
    }

    const account = governance.phase7AccountManager.getAccount(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found', accountId });
    }

    if (!governance.snapshotGenerator || !governance.eventLog) {
      return res.status(503).json({
        error: 'Observability not enabled',
        message: 'Snapshot generator is not available'
      });
    }

    // Get all snapshots and filter by account events
    let snapshots = governance.snapshotGenerator.getAllSnapshots();

    // Filter by date range if provided
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      snapshots = snapshots.filter(s => s.date >= startDate && s.date <= endDate);
    }

    // Filter snapshots that have events for this account
    const accountSnapshots = snapshots.filter(snapshot => {
      const events = governance.eventLog!.getEventsForDay(new Date(snapshot.date));
      return events.some(e => (e as any).accountId === accountId);
    });

    return res.status(200).json({
      success: true,
      accountId,
      snapshots: accountSnapshots.map(s => ({
        ...s,
        strategyPnL: Object.fromEntries(s.strategyPnL),
        strategyDrawdowns: Object.fromEntries(s.strategyDrawdowns),
        capitalAllocation: Object.fromEntries(s.capitalAllocation),
        eventTypes: Object.fromEntries(s.eventTypes),
        timestamp: s.timestamp.toISOString()
      })),
      total: accountSnapshots.length
    });
  } catch (error: any) {
    console.error('[ACCOUNT_API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

