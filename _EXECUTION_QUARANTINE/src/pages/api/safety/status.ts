/**
 * API endpoint to get safety engine status
 */

import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import the safety engine module
    const safetyEnginePath = path.join(process.cwd(), 'core', 'safetyEngine.js');
    delete require.cache[require.resolve(safetyEnginePath)];
    const { getSafetyStatus } = require(safetyEnginePath);

    const status = getSafetyStatus();

    return res.status(200).json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('Error getting safety status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get safety status'
    });
  }
}

