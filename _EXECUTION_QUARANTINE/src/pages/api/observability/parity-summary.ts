/**
 * Read-Only Operator API: Parity Summary
 * 
 * PHASE 9: Shadow Trading & Execution Parity
 * 
 * Exposes parity summary for operator viewing.
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
    const { format } = req.query;
    const governance = getGovernanceInstance();

    // Check if shadow tracker is available
    // Note: Shadow tracker is only available when system is running in SHADOW mode
    // For API access, we need to get it from the governance system
    // Since shadow tracker is passed to governance system, we need a way to access it
    
    // For now, return error if shadow mode is not active
    // In production, you might want to store shadow records in a database
    // or expose them through the governance system
    
    return res.status(503).json({
      error: 'Shadow mode not active',
      message: 'Parity summary is only available when system is running in SHADOW mode',
      hint: 'Run shadow mode script to generate parity data: node scripts/run-shadow-mode.js'
    });

    // TODO: When shadow records are persisted, implement:
    // 1. Load shadow records from storage
    // 2. Generate parity summary
    // 3. Return in requested format (JSON or text)

  } catch (error: any) {
    console.error('[PARITY_SUMMARY_API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
