import { NextApiRequest, NextApiResponse } from 'next';
import { metaStrategyAllocation } from '../../../services/metaStrategyAllocation';
import { liveTradingEngine } from '../../../services/liveTradingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get current allocation status
    try {
      const strategies = liveTradingEngine.getStrategyPerformance();
      const summary = metaStrategyAllocation.getPerformanceSummary();
      const scores = metaStrategyAllocation.getStrategyScores();
      const history = metaStrategyAllocation.getAllocationHistory();
      
      res.status(200).json({
        success: true,
        data: {
          currentStrategies: strategies,
          strategyScores: scores,
          allocationSummary: summary,
          allocationHistory: history.slice(-10), // Last 10 decisions
          shouldReallocate: metaStrategyAllocation.shouldReallocate()
        }
      });
    } catch (error) {
      console.error('❌ Error getting allocation status:', error);
      res.status(500).json({ error: 'Failed to get allocation status' });
    }
  } else if (req.method === 'POST') {
    // Calculate new allocations
    try {
      const { marketRegime = 'unknown', forceReallocation = false } = req.body;
      
      const strategies = liveTradingEngine.getStrategyPerformance();
      
      // Check if reallocation is needed
      if (!forceReallocation && !metaStrategyAllocation.shouldReallocate()) {
        return res.status(200).json({
          success: true,
          message: 'Reallocation not needed yet',
          data: {
            shouldReallocate: false,
            nextReallocation: metaStrategyAllocation.getPerformanceSummary().nextReallocation
          }
        });
      }
      
      // Calculate new allocations
      const decision = metaStrategyAllocation.calculateStrategyAllocations(strategies, marketRegime);
      
      res.status(200).json({
        success: true,
        data: {
          allocationDecision: decision,
          strategyScores: metaStrategyAllocation.getStrategyScores(),
          summary: metaStrategyAllocation.getPerformanceSummary()
        }
      });
    } catch (error) {
      console.error('❌ Error calculating allocations:', error);
      res.status(500).json({ error: 'Failed to calculate allocations' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 