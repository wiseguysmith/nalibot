import { NextApiRequest, NextApiResponse } from 'next';
import { marketDataService } from '../../../services/marketDataService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get cache statistics
    try {
      const stats = marketDataService.getCacheStats();
      
      res.status(200).json({
        success: true,
        stats: {
          ...stats,
          totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2)
        }
      });
    } catch (error: any) {
      console.error('Cache stats error:', error);
      res.status(500).json({ error: 'Failed to get cache statistics' });
    }
  } else if (req.method === 'DELETE') {
    // Clear cache
    try {
      const { symbol, provider } = req.body;
      marketDataService.clearCache(symbol, provider);
      
      res.status(200).json({
        success: true,
        message: symbol || provider ? `Cache cleared for ${symbol || provider}` : 'All cache cleared'
      });
    } catch (error: any) {
      console.error('Cache clear error:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 