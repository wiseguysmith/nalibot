/**
 * Read-Only Operator Account API Routes
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Read-only API endpoints for account management and observability.
 * No execution capabilities - read-only access only.
 */

import { NextApiRequest, NextApiResponse } from 'next';
// HARDENING: Import bootstrap to ensure governance is initialized
import '../../../lib/governance_bootstrap';
import { getGovernanceInstance } from '../../../lib/governance_instance';

/**
 * GET /api/accounts
 * 
 * List all accounts with summary information.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed - read-only API' });
  }

  try {
    const governance = getGovernanceInstance();

    if (!governance.phase7AccountManager) {
      return res.status(503).json({
        error: 'Account abstraction not enabled',
        message: 'Account manager is not available',
        accounts: []
      });
    }

    const accounts = governance.phase7AccountManager.getAllAccounts();
    const summaries = accounts.map(account => account.getSummary());

    return res.status(200).json({
      success: true,
      accounts: summaries,
      total: summaries.length
    });
  } catch (error: any) {
    console.error('[ACCOUNT_API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

