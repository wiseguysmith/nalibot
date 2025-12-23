/**
 * API endpoint to get metadata for a specific strategy
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { strategyName } = req.query;

  if (!strategyName || typeof strategyName !== 'string') {
    return res.status(400).json({ error: 'Strategy name is required' });
  }

  try {
    const strategyPath = path.join(process.cwd(), 'strategies', `${strategyName}.js`);
    
    if (!fs.existsSync(strategyPath)) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    delete require.cache[require.resolve(strategyPath)];
    const strategy = require(strategyPath);

    return res.status(200).json({
      success: true,
      strategy: {
        name: strategy.name,
        id: strategyName,
        riskLevel: strategy.riskLevel,
        expectedReturn: strategy.expectedReturn,
        strategyMix: strategy.strategyMix,
        timeHorizonMonths: strategy.timeHorizonMonths,
        coreLogicDescription: strategy.coreLogicDescription,
        behaviorDescription: strategy.behaviorDescription,
        keyFeatures: strategy.keyFeatures
      }
    });
  } catch (error: any) {
    console.error('Error loading strategy:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load strategy'
    });
  }
}

