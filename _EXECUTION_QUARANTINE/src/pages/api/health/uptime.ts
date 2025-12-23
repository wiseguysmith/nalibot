/**
 * Read-Only Operator Uptime Endpoint
 * 
 * PHASE 5: Production Hardening & Resilience
 * 
 * Exposes system uptime.
 * READ-ONLY - No execution, no adapters, no state mutation.
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
    const governance = getGovernanceInstance();
    const health = governance.getSystemHealth();

    if (!health) {
      return res.status(503).json({
        error: 'Health monitoring not enabled',
        message: 'Health monitor is not available'
      });
    }

    // Format uptime string
    const uptimeMs = health.uptime;
    const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptimeMs % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((uptimeMs % (60 * 1000)) / 1000);
    
    const uptimeString = days > 0
      ? `${days}d ${hours}h ${minutes}m ${seconds}s`
      : hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
      ? `${minutes}m ${seconds}s`
      : `${seconds}s`;

    return res.status(200).json({
      success: true,
      uptime: uptimeMs,
      uptimeString,
      startTime: health.startTime?.toISOString() || null
    });

  } catch (error: any) {
    console.error('Uptime API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch uptime',
      details: error.message
    });
  }
}

