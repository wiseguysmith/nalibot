/**
 * Read-Only Operator API: Attribution
 * 
 * PHASE 4: Observability, Attribution & Replay
 * 
 * Exposes per-layer attribution for operator analysis.
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
    const { tradeId, strategyId, startDate, endDate } = req.query;
    const governance = getGovernanceInstance();

    if (!governance.attributionEngine || !governance.eventLog) {
      return res.status(503).json({
        error: 'Observability not enabled',
        message: 'Attribution engine is not available'
      });
    }

    // Get attribution for specific trade (by event ID or trade details)
    if (tradeId && typeof tradeId === 'string') {
      // Find trade event by ID
      const events = governance.eventLog.getAllEvents();
      const tradeEvent = events.find(e => 
        e.eventId === tradeId || 
        (e.eventType === 'TRADE_EXECUTED' && (e as any).orderId === tradeId)
      );

      if (!tradeEvent) {
        return res.status(404).json({
          error: 'Trade not found',
          tradeId
        });
      }

      // Attribute the trade
      const attribution = governance.attributionEngine.attributeTrade(
        governance.eventLog,
        tradeEvent.strategyId || '',
        (tradeEvent as any).pair || '',
        tradeEvent.timestamp
      );

      return res.status(200).json({
        success: true,
        attribution
      });
    }

    // Get attribution summary for date range
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      // Get events in range
      const events = governance.eventLog.getEventsInRange(
        new Date(startDate),
        new Date(endDate)
      );

      // Calculate summary from events
      const tradeExecuted = events.filter(e => e.eventType === 'TRADE_EXECUTED').length;
      const tradeBlocked = events.filter(e => e.eventType === 'TRADE_BLOCKED').length;
      const blockedByCapital = events.filter(e => 
        e.eventType === 'TRADE_BLOCKED' && (e as any).blockingLayer === 'CAPITAL'
      ).length;
      const blockedByRegime = events.filter(e => 
        e.eventType === 'TRADE_BLOCKED' && (e as any).blockingLayer === 'REGIME'
      ).length;
      const blockedByPermission = events.filter(e => 
        e.eventType === 'TRADE_BLOCKED' && (e as any).blockingLayer === 'PERMISSION'
      ).length;
      const blockedByRisk = events.filter(e => 
        e.eventType === 'TRADE_BLOCKED' && (e as any).blockingLayer === 'RISK'
      ).length;

      const summary = {
        totalTrades: tradeExecuted + tradeBlocked,
        executed: tradeExecuted,
        blocked: tradeBlocked,
        blockingBreakdown: {
          CAPITAL: blockedByCapital,
          REGIME: blockedByRegime,
          PERMISSION: blockedByPermission,
          RISK: blockedByRisk
        }
      };

      return res.status(200).json({
        success: true,
        summary
      });
    }

    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['tradeId'] or ['startDate', 'endDate']
    });

  } catch (error: any) {
    console.error('Attribution API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch attribution',
      details: error.message
    });
  }
}

