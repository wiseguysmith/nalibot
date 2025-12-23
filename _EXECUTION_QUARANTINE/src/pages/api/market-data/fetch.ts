import { NextApiRequest, NextApiResponse } from 'next';
import { marketDataService } from '../../../services/marketDataService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symbol, startDate, endDate, timeframe, provider } = req.body;

    // Validate input
    if (!symbol || !startDate || !endDate) {
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

    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const tf = timeframe || '1h';
    if (!validTimeframes.includes(tf)) {
      return res.status(400).json({ error: 'Invalid timeframe' });
    }

    // Validate provider
    const validProviders = ['kraken', 'binance', 'coingecko'];
    const prov = provider || 'kraken';
    if (!validProviders.includes(prov)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Fetch data
    const data = await marketDataService.getHistoricalData(symbol, start, end, tf, prov);
    
    // Get quality metrics
    const quality = marketDataService.getDataQuality(symbol, start, end, tf, prov);

    res.status(200).json({
      success: true,
      data: {
        symbol,
        timeframe: tf,
        provider: prov,
        startDate: start,
        endDate: end,
        dataPoints: data.length,
        data: data,
        quality: quality
      }
    });
  } catch (error: any) {
    console.error('Market data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch market data: ' + error.message });
  }
} 