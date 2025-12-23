import { NextApiRequest, NextApiResponse } from 'next';
import { backtestingEngine } from '../../../services/backtestingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { strategy, symbol, startDate, endDate, parameterRanges, initialCapital, provider } = req.body;

    // Validate input
    if (!strategy || !symbol || !startDate || !endDate || !parameterRanges) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Set initial capital
    const capital = initialCapital || 10000;
    backtestingEngine['initialCapital'] = capital;
    backtestingEngine['currentCapital'] = capital;

    // Run optimization with provider
    const optimizationResult = await backtestingEngine.optimizeStrategy(
      strategy,
      symbol,
      start,
      end,
      parameterRanges,
      provider || 'kraken'
    );

    res.status(200).json({
      success: true,
      optimizationResult
    });
  } catch (error: any) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: 'Optimization failed: ' + error.message });
  }
} 