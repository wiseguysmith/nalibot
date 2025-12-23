/**
 * Governance Instance Manager
 * 
 * Provides singleton access to GovernanceSystem for API routes.
 * 
 * HARDENING: Explicit initialization guard prevents implicit default initialization.
 * In production, governance must be initialized at application startup.
 */

import { GovernanceSystem } from '../../core/governance_integration';

let governanceInstance: GovernanceSystem | null = null;
let initializationAttempted: boolean = false;

/**
 * Initialize governance system
 * 
 * MUST be called at application startup before any API routes access governance.
 * This ensures deterministic, production-safe initialization.
 * 
 * @param config Governance system configuration
 * @throws Error if governance is already initialized
 */
export function initializeGovernance(config: {
  initialMode?: 'AGGRESSIVE' | 'OBSERVE_ONLY';
  initialCapital?: number;
  exchangeClient?: any;
  enableRegimeGovernance?: boolean;
  enableCapitalGovernance?: boolean;
  directionalCapital?: number;
  arbitrageCapital?: number;
  enableObservability?: boolean;
  enableProductionHardening?: boolean;
  enableAccountAbstraction?: boolean;
  phase7AccountManager?: any;
  executionMode?: 'SIMULATION' | 'REAL'; // PHASE 8: Execution mode
}): void {
  if (governanceInstance !== null) {
    throw new Error('Governance system already initialized. Cannot reinitialize.');
  }

  governanceInstance = new GovernanceSystem(config);
  initializationAttempted = true;
  
  console.log('[GOVERNANCE_INSTANCE] Governance system initialized with explicit configuration');
}

/**
 * Get governance system instance
 * 
 * HARDENING: Fail-fast if governance accessed before explicit initialization.
 * This prevents implicit default initialization in production.
 * 
 * @throws Error if governance not initialized
 */
export function getGovernanceInstance(): GovernanceSystem {
  if (governanceInstance === null) {
    if (initializationAttempted) {
      throw new Error('Governance system initialization failed. System unavailable.');
    }
    
    // Fail-fast: Do not allow implicit default initialization
    throw new Error(
      'Governance system not initialized. ' +
      'Call initializeGovernance() at application startup before accessing governance. ' +
      'Implicit default initialization is disabled for production safety.'
    );
  }
  
  return governanceInstance;
}

/**
 * Set governance instance (for testing or custom initialization)
 * 
 * Use with caution - primarily for testing.
 */
export function setGovernanceInstance(instance: GovernanceSystem): void {
  governanceInstance = instance;
  initializationAttempted = true;
}

/**
 * Check if governance is initialized
 */
export function isGovernanceInitialized(): boolean {
  return governanceInstance !== null;
}

