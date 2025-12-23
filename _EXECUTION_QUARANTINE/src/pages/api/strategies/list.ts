/**
 * API endpoint to list all available strategies
 * Loads strategies from the /strategies/ folder
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const strategiesDir = path.join(process.cwd(), 'strategies');
    const strategyFiles = fs.readdirSync(strategiesDir).filter(file => file.endsWith('.js'));
    
    const strategies = [];
    
    for (const file of strategyFiles) {
      const strategyName = file.replace('.js', '');
      const strategyPath = path.join(strategiesDir, file);
      
      // Dynamically import the strategy
      delete require.cache[require.resolve(strategyPath)];
      const strategy = require(strategyPath);
      
      strategies.push({
        name: strategy.name,
        id: strategyName,
        riskLevel: strategy.riskLevel,
        expectedReturn: strategy.expectedReturn,
        strategyMix: strategy.strategyMix,
        timeHorizonMonths: strategy.timeHorizonMonths,
        coreLogicDescription: strategy.coreLogicDescription,
        behaviorDescription: strategy.behaviorDescription,
        keyFeatures: strategy.keyFeatures
      });
    }

    return res.status(200).json({
      success: true,
      strategies: strategies.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error: any) {
    console.error('Error loading strategies:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load strategies'
    });
  }
}

