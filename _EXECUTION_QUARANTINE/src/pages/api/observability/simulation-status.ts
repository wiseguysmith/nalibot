/**
 * Simulation Status API
 * 
 * VALIDATION MODE: Returns current SIM mode status and metrics.
 * 
 * Read-only endpoint that provides:
 * - Is SIM mode active?
 * - Current simulated capital
 * - Total simulated PnL
 * - Trade count
 * - Open positions count
 * - Last trade timestamp
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../lib/governance_instance';
import { EventType, TradeExecutedEvent } from '../../../../core/observability/event_log';

interface SimulationStatus {
  isActive: boolean;
  currentCapital: number;
  totalPnL: number;
  tradeCount: number;
  openPositionsCount: number;
  lastTradeTimestamp: string | null;
  initialCapital: number;
  winRate: number;
  averageTradeSize: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed - read-only API' });
  }

  try {
    const governance = getGovernanceInstance();

    if (!governance.eventLog) {
      return res.status(503).json({
        success: false,
        error: 'Observability not enabled',
        message: 'Event log is not available'
      });
    }

    // Get all SIM trades
    const allEvents = governance.eventLog.getAllEvents();
    const simTrades = allEvents
      .filter(e => {
        if (e.eventType === EventType.TRADE_EXECUTED) {
          const tradeEvent = e as TradeExecutedEvent;
          return tradeEvent.executionType === 'SIMULATED';
        }
        return false;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) as TradeExecutedEvent[];

    // Check if SIM mode is active (has trades in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTrades = simTrades.filter(t => t.timestamp >= oneHourAgo);
    const isActive = recentTrades.length > 0;

    // Calculate metrics
    const initialCapital = 100; // Default from PAPER_TRADING_INITIAL_CAPITAL
    let totalPnL = 0;
    let winningTrades = 0;
    let totalTradeValue = 0;

    for (const trade of simTrades) {
      if (trade.metadata?.pnl !== undefined) {
        totalPnL += trade.metadata.pnl;
        if (trade.metadata.pnl > 0) {
          winningTrades++;
        }
      }
      totalTradeValue += trade.executedValue || 0;
    }

    const currentCapital = initialCapital + totalPnL;
    const winRate = simTrades.length > 0 ? (winningTrades / simTrades.length) * 100 : 0;
    const averageTradeSize = simTrades.length > 0 ? totalTradeValue / simTrades.length : 0;

    // Calculate open positions (simplified - buy opens, sell closes)
    const positions = new Map<string, number>();
    for (const trade of simTrades) {
      const key = trade.pair;
      if (trade.action === 'buy') {
        positions.set(key, (positions.get(key) || 0) + (trade.metadata?.quantity || trade.amount));
      } else if (trade.action === 'sell') {
        const current = positions.get(key) || 0;
        const closed = Math.min(current, trade.metadata?.quantity || trade.amount);
        if (closed >= current) {
          positions.delete(key);
        } else {
          positions.set(key, current - closed);
        }
      }
    }

    const openPositionsCount = positions.size;
    const lastTradeTimestamp = simTrades.length > 0 ? simTrades[0].timestamp.toISOString() : null;

    const status: SimulationStatus = {
      isActive,
      currentCapital,
      totalPnL,
      tradeCount: simTrades.length,
      openPositionsCount,
      lastTradeTimestamp,
      initialCapital,
      winRate,
      averageTradeSize
    };

    return res.status(200).json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('[SIMULATION_STATUS_API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get simulation status'
    });
  }
}
