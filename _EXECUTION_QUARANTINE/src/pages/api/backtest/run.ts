import { NextApiRequest, NextApiResponse } from 'next';
import { backtestingEngine } from '../../../services/backtestingEngine';
import { authService } from '../../../services/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { strategy, symbol, startDate, endDate, initialCapital, provider } = req.body;

    // Validate input
    if (!strategy || !symbol || !startDate || !endDate) {
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

    // Run backtest with provider
    const result = await backtestingEngine.runBacktest(
      strategy,
      symbol,
      start,
      end,
      provider || 'kraken'
    );

    res.status(200).json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('Backtest error:', error);
    res.status(500).json({ error: 'Backtest failed: ' + error.message });
  }
} 