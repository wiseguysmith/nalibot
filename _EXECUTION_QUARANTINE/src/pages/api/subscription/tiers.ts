import { NextApiRequest, NextApiResponse } from 'next';
import { authService } from '../../../services/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tiers = authService.getSubscriptionTiers();

    res.status(200).json({
      success: true,
      tiers: tiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        price: tier.price,
        maxStrategies: tier.maxStrategies,
        maxPortfolio: tier.maxPortfolio,
        maxExchanges: tier.maxExchanges,
        features: tier.features,
        performanceFee: tier.performanceFee
      }))
    });
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 