/**
 * API endpoint to explain a trade
 * Uses the tradeExplanation module
 */

import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trade, strategyName, marketData } = req.body;

    if (!trade || !strategyName) {
      return res.status(400).json({ error: 'Trade and strategyName are required' });
    }

    // Import the trade explanation module
    const tradeExplanationPath = path.join(process.cwd(), 'core', 'tradeExplanation.js');
    delete require.cache[require.resolve(tradeExplanationPath)];
    const { explainTrade } = require(tradeExplanationPath);

    const explanation = explainTrade(trade, strategyName, marketData || {});

    return res.status(200).json({
      success: true,
      explanation
    });
  } catch (error: any) {
    console.error('Error explaining trade:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to explain trade'
    });
  }
}

