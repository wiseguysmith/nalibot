/**
 * Read-Only Operator Account Events API Route
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Read-only endpoint for account-scoped events.
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../../../lib/governance_instance';
import { EventType } from '../../../../../core/observability/event_log';

/**
 * GET /api/accounts/[accountId]/events
 * 
 * Get events for a specific account.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed - read-only API' });
  }

  try {
    const { accountId } = req.query;
    const { startDate, endDate, eventType, limit } = req.query;

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

    if (!governance.eventLog) {
      return res.status(503).json({
        error: 'Observability not enabled',
        message: 'Event log is not available'
      });
    }

    // Get all events and filter by account
    let events = governance.eventLog.getAllEvents().filter(e => 
      (e as any).accountId === accountId
    );

    // Filter by event type
    if (eventType && typeof eventType === 'string') {
      events = events.filter(e => e.eventType === eventType as EventType);
    }

    // Filter by date range
    if (startDate && typeof startDate === 'string') {
      const start = new Date(startDate);
      events = events.filter(e => e.timestamp >= start);
    }

    if (endDate && typeof endDate === 'string') {
      const end = new Date(endDate);
      events = events.filter(e => e.timestamp <= end);
    }

    // Sort by timestamp (newest first)
    events = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        events = events.slice(0, limitNum);
      }
    }

    return res.status(200).json({
      success: true,
      accountId,
      events: events.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString()
      })),
      total: events.length
    });
  } catch (error: any) {
    console.error('[ACCOUNT_API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

