/**
 * Read-Only Operator API: Events
 * 
 * PHASE 4: Observability, Attribution & Replay
 * 
 * Exposes event log for operator viewing.
 * READ-ONLY - No execution, no writes, no governance bypass.
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../lib/governance_instance';
import { EventType, TradeExecutedEvent } from '../../../../core/observability/event_log';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed - read-only API' });
  }

  try {
    const { eventType, strategyId, accountId, startDate, endDate, limit, executionType } = req.query;
    const governance = getGovernanceInstance();

    if (!governance.eventLog) {
      return res.status(503).json({
        error: 'Observability not enabled',
        message: 'Event log is not available'
      });
    }

    let events = governance.eventLog.getAllEvents();

    // Filter by event type
    if (eventType && typeof eventType === 'string') {
      events = events.filter(e => e.eventType === eventType as EventType);
    }

    // Filter by execution type (for TRADE_EXECUTED events)
    if (executionType && typeof executionType === 'string') {
      events = events.filter(e => {
        if (e.eventType === EventType.TRADE_EXECUTED) {
          const tradeEvent = e as TradeExecutedEvent;
          return tradeEvent.executionType === executionType;
        }
        return false; // Only TRADE_EXECUTED events have executionType
      });
    }

    // Filter by strategy
    if (strategyId && typeof strategyId === 'string') {
      events = events.filter(e => e.strategyId === strategyId);
    }

    // Filter by account (PHASE 7)
    if (accountId && typeof accountId === 'string') {
      events = events.filter(e => (e as any).accountId === accountId);
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
      events: events.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString()
      })),
      total: events.length
    });

  } catch (error: any) {
    console.error('Events API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch events',
      details: error.message
    });
  }
}

