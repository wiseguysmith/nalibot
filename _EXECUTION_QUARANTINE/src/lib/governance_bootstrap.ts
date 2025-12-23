/**
 * Governance Bootstrap
 * 
 * HARDENING: Explicit application startup initialization.
 * 
 * This file should be imported at application startup to ensure
 * governance is initialized before any API routes are accessed.
 * 
 * Usage:
 *   import './lib/governance_bootstrap';
 * 
 * Or call initializeGovernance() explicitly with production config.
 */

import { initializeGovernance } from './governance_instance';

/**
 * Initialize governance system with production-safe defaults
 * 
 * This initialization runs when this module is imported.
 * For custom configuration, call initializeGovernance() explicitly
 * with your desired configuration.
 */
if (typeof window === 'undefined') {
  // Server-side only (Next.js API routes)
  try {
    initializeGovernance({
      initialMode: process.env.SYSTEM_MODE === 'AGGRESSIVE' ? 'AGGRESSIVE' : 'OBSERVE_ONLY',
      initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '10000'),
      enableRegimeGovernance: true,
      enableCapitalGovernance: true,
      enableObservability: true,
      enableProductionHardening: true,
      enableAccountAbstraction: process.env.ENABLE_ACCOUNT_ABSTRACTION === 'true'
    });
    
    console.log('[GOVERNANCE_BOOTSTRAP] Governance system initialized at application startup');
  } catch (error: any) {
    console.error('[GOVERNANCE_BOOTSTRAP] Failed to initialize governance:', error.message);
    // Do not throw - allow application to start, but governance will fail-fast on access
  }
}

