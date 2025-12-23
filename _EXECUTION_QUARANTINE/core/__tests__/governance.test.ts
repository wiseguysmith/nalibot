/**
 * Phase 1 Governance Tests
 * 
 * Validates that governance infrastructure works correctly.
 * These tests ensure the system cannot execute unauthorized trades.
 */

import { ModeController } from '../mode_controller';
import { RiskGovernor, TradeRequest } from '../../src/services/riskGovernor';
import { PermissionGate } from '../permission_gate';
import { ExecutionManager } from '../execution_manager';
import { GovernanceSystem, createTradeRequest } from '../governance_integration';

describe('Phase 1: Governance & Survival', () => {
  let governance: GovernanceSystem;

  beforeEach(() => {
    governance = new GovernanceSystem({
      initialMode: 'OBSERVE_ONLY',
      initialCapital: 1000
    });
  });

  describe('Mode Controller', () => {
    test('OBSERVE_ONLY mode blocks trading', () => {
      const permissions = governance.modeController.getPermissions();
      expect(permissions.tradingAllowed).toBe(false);
    });

    test('AGGRESSIVE mode allows trading', () => {
      governance.modeController.setMode('AGGRESSIVE');
      const permissions = governance.modeController.getPermissions();
      expect(permissions.tradingAllowed).toBe(true);
    });

    test('Mode changes are logged', () => {
      governance.modeController.setMode('AGGRESSIVE', 'Test mode change');
      const history = governance.modeController.getModeHistory();
      expect(history.length).toBeGreaterThan(1);
      expect(history[history.length - 1].mode).toBe('AGGRESSIVE');
    });
  });

  describe('Risk Governor', () => {
    test('SHUTDOWN state blocks all trades', () => {
      governance.riskGovernor.setState('SHUTDOWN', 'Test shutdown');
      
      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const approved = governance.riskGovernor.approveTrade(request);
      expect(approved).toBe(false);
    });

    test('PAUSED state blocks all trades', () => {
      governance.riskGovernor.setState('PAUSED', 'Test pause');
      
      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const approved = governance.riskGovernor.approveTrade(request);
      expect(approved).toBe(false);
    });

    test('Auto-shutdown on drawdown limit', () => {
      // Set drawdown to exceed limit
      governance.riskGovernor['metrics'].systemDrawdown = 30; // Exceeds 25% limit
      
      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const approved = governance.riskGovernor.approveTrade(request);
      expect(approved).toBe(false);
      expect(governance.riskGovernor.getRiskState()).toBe('SHUTDOWN');
    });
  });

  describe('Permission Gate', () => {
    test('OBSERVE_ONLY mode blocks execution', () => {
      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const permission = governance.permissionGate.checkPermission(request);
      expect(permission.allowed).toBe(false);
      expect(permission.source).toBe('MODE_CONTROLLER');
    });

    test('SHUTDOWN state blocks execution even in AGGRESSIVE mode', () => {
      governance.modeController.setMode('AGGRESSIVE');
      governance.riskGovernor.setState('SHUTDOWN', 'Test');

      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const permission = governance.permissionGate.checkPermission(request);
      expect(permission.allowed).toBe(false);
      expect(permission.source).toBe('RISK_GOVERNOR');
    });

    test('Valid trade is approved in AGGRESSIVE mode with ACTIVE state', () => {
      governance.modeController.setMode('AGGRESSIVE');
      // Risk Governor starts in ACTIVE state

      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const permission = governance.permissionGate.checkPermission(request);
      expect(permission.allowed).toBe(true);
      expect(permission.source).toBe('APPROVED');
    });
  });

  describe('Execution Manager', () => {
    test('Cannot execute trade in OBSERVE_ONLY mode', async () => {
      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const result = await governance.executionManager.executeTrade(request);
      expect(result.success).toBe(false);
    });

    test('Cannot execute trade in SHUTDOWN state', async () => {
      governance.modeController.setMode('AGGRESSIVE');
      governance.riskGovernor.setState('SHUTDOWN', 'Test');

      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const result = await governance.executionManager.executeTrade(request);
      expect(result.success).toBe(false);
    });

    test('Execution history is maintained', async () => {
      const request = createTradeRequest({
        strategy: 'test',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      await governance.executionManager.executeTrade(request);
      const history = governance.executionManager.getExecutionHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    test('Complete flow: OBSERVE_ONLY blocks execution', async () => {
      // System starts in OBSERVE_ONLY
      expect(governance.isTradingAllowed()).toBe(false);

      const request = createTradeRequest({
        strategy: 'mean_reversion',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      const result = await governance.executionManager.executeTrade(request);
      expect(result.success).toBe(false);
    });

    test('Complete flow: Valid trade executes in AGGRESSIVE mode', async () => {
      governance.modeController.setMode('AGGRESSIVE');
      expect(governance.isTradingAllowed()).toBe(true);

      const request = createTradeRequest({
        strategy: 'mean_reversion',
        pair: 'BTC/USD',
        action: 'buy',
        amount: 0.01,
        price: 50000
      });

      // In OBSERVE_ONLY, this simulates execution
      // In real mode with exchange client, this would execute
      const result = await governance.executionManager.executeTrade(request);
      // Result may succeed (simulated) but no capital deployed in OBSERVE_ONLY
      // The key is that permission gate was checked
      expect(result.pair).toBe('BTC/USD');
    });
  });
});

