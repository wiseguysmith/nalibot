/**
 * Read-Only Operator Account Detail API Route
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Read-only endpoint for account details, PnL, drawdown, etc.
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../../lib/governance_instance';

/**
 * GET /api/accounts/[accountId]
 * 
 * Get detailed information for a specific account.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed - read-only API' });
  }

  try {
    const { accountId } = req.query;

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

    const summary = account.getSummary();
    const capitalMetrics = account.getCapitalMetrics();
    const stateHistory = account.getStateHistory();

    // Get risk budget summary if available (PHASE 8)
    let riskBudgetSummary = null;
    if (account.riskBudget) {
      riskBudgetSummary = account.riskBudget.getSummary();
    }

    // Get strategy allocations if available (PHASE 8)
    let strategyAllocations = null;
    if (account.strategyRiskAllocator) {
      strategyAllocations = account.strategyRiskAllocator.getSummary();
    }

    return res.status(200).json({
      success: true,
      account: {
        ...summary,
        capitalMetrics: {
          ...capitalMetrics,
          directionalPool: {
            ...capitalMetrics.directionalPool
          },
          arbitragePool: {
            ...capitalMetrics.arbitragePool
          }
        },
        stateHistory: stateHistory.map(s => ({
          ...s,
          timestamp: s.timestamp.toISOString()
        })),
        riskBudget: riskBudgetSummary,
        strategyAllocations
      }
    });
  } catch (error: any) {
    console.error('[ACCOUNT_API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

