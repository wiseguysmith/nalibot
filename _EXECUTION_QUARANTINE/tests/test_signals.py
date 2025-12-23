"""
Test Harness for Alpha Modules
Tests all signal generation modules
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / 'modules'))

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_speed_module():
    """Test Speed Edge Module"""
    print("\n" + "="*60)
    print("Testing Speed Edge Module")
    print("="*60)
    
    try:
        from fast_market_listener import FastMarketListener
        
        listener = FastMarketListener('binance')
        signal = await listener.get_signal('BTC/USDT')
        print(f"✓ Speed Edge Signal: {signal:.3f}")
        await listener.disconnect()
        return True
    except Exception as e:
        print(f"✗ Speed Edge Module failed: {e}")
        return False

def test_alt_data_module():
    """Test Alternative Data Engine"""
    print("\n" + "="*60)
    print("Testing Alternative Data Engine")
    print("="*60)
    
    try:
        from alt_data_engine import AltDataEngine
        
        engine = AltDataEngine()
        signal = engine.get_signal('BTC/USDT')
        print(f"✓ Alternative Data Signal: {signal:.3f}")
        return True
    except Exception as e:
        print(f"✗ Alternative Data Engine failed: {e}")
        return False

async def test_microstructure_module():
    """Test Market Microstructure Module"""
    print("\n" + "="*60)
    print("Testing Market Microstructure Module")
    print("="*60)
    
    try:
        from microstructure_model import MicrostructureModel
        
        model = MicrostructureModel('binance')
        signal = await model.get_signal('BTC/USDT')
        print(f"✓ Microstructure Signal: {signal:.3f}")
        await model.orderbook_engine.disconnect()
        return True
    except Exception as e:
        print(f"✗ Microstructure Module failed: {e}")
        return False

async def test_options_flow_module():
    """Test Options Flow Engine"""
    print("\n" + "="*60)
    print("Testing Options Flow Engine")
    print("="*60)
    
    try:
        from options_flow_engine import OptionsFlowEngine
        
        engine = OptionsFlowEngine('binance')
        signal = await engine.get_signal('BTC/USDT')
        print(f"✓ Options Flow Signal: {signal:.3f}")
        return True
    except Exception as e:
        print(f"✗ Options Flow Engine failed: {e}")
        return False

def test_volatility_predictor():
    """Test AI Volatility Predictor"""
    print("\n" + "="*60)
    print("Testing AI Volatility Predictor")
    print("="*60)
    
    try:
        from ai_volatility_predictor import AIVolatilityPredictor
        
        predictor = AIVolatilityPredictor()
        features = {
            'volatility_history': 0.05,
            'cvd': 0.3,
            'orderbook_imbalance': 0.2,
            'funding_rate': 0.001,
            'sentiment': 0.1,
            'google_trends': 0.2,
            'oi_change': 0.1
        }
        signal = predictor.get_signal(features)
        print(f"✓ Volatility Probability: {signal:.3f}")
        return True
    except Exception as e:
        print(f"✗ Volatility Predictor failed: {e}")
        return False

async def test_strategy_manager():
    """Test Strategy Manager Integration"""
    print("\n" + "="*60)
    print("Testing Strategy Manager Integration")
    print("="*60)
    
    try:
        from strategy_manager import StrategyManager
        
        manager = StrategyManager()
        
        # Test combined signal
        combined = await manager.get_combined_signal('BTC/USDT')
        print(f"✓ Combined Signal: {combined['signal']:.3f}")
        print(f"✓ Action: {combined['action']}")
        print(f"✓ Module Signals:")
        for module, value in combined['module_signals'].items():
            print(f"    - {module}: {value:.3f}")
        
        return True
    except Exception as e:
        print(f"✗ Strategy Manager failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_risk_manager():
    """Test Risk Manager"""
    print("\n" + "="*60)
    print("Testing Risk Manager")
    print("="*60)
    
    try:
        from risk_manager import RiskManager
        
        manager = RiskManager()
        portfolio = {'balance': 1000.0}
        trade = {'amount': 100, 'price': 45000, 'type': 'BUY'}
        market_data = {'volatility': 0.05}
        oi_data = {'oi_change': 0.1}
        sentiment_data = {'sentiment_score': 0.2}
        
        checks = manager.run_safety_checks(trade, portfolio, market_data, oi_data, sentiment_data)
        print(f"✓ Safety Checks: {'PASSED' if checks['allowed'] else 'FAILED'}")
        if checks['warnings']:
            print(f"  Warnings: {checks['warnings']}")
        if checks['errors']:
            print(f"  Errors: {checks['errors']}")
        
        return True
    except Exception as e:
        print(f"✗ Risk Manager failed: {e}")
        return False

def test_trade_executor():
    """Test Trade Executor"""
    print("\n" + "="*60)
    print("Testing Trade Executor")
    print("="*60)
    
    try:
        from trade_executor import TradeExecutor
        from risk_manager import RiskManager
        
        executor = TradeExecutor(risk_manager=RiskManager())
        portfolio = {'balance': 1000}
        trade_signal = {
            'pair': 'BTC/USDT',
            'action': 'buy',
            'amount': 100,
            'price': 45000,
            'strategy': 'conservative'
        }
        market_data = {'price': 45000}
        
        result = executor.execute_trade(trade_signal, portfolio, market_data)
        print(f"✓ Trade Execution: {'SUCCESS' if result['success'] else 'FAILED'}")
        if result['success']:
            print(f"  Order ID: {result['order']['id']}")
            print(f"  Execution Latency: {result.get('execution_latency_ms', 0):.2f}ms")
        
        return True
    except Exception as e:
        print(f"✗ Trade Executor failed: {e}")
        return False

async def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("ALPHA MODULES TEST SUITE")
    print("="*60)
    
    results = {}
    
    # Test individual modules
    results['speed'] = await test_speed_module()
    results['alt_data'] = test_alt_data_module()
    results['microstructure'] = await test_microstructure_module()
    results['options_flow'] = await test_options_flow_module()
    results['volatility'] = test_volatility_predictor()
    
    # Test integrations
    results['strategy_manager'] = await test_strategy_manager()
    results['risk_manager'] = await test_risk_manager()
    results['trade_executor'] = test_trade_executor()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name:20s} {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return passed == total

if __name__ == '__main__':
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)

