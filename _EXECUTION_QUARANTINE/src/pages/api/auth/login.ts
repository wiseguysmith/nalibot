import { NextApiRequest, NextApiResponse } from 'next';
import { authService } from '../../../services/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Login user
    const { user, token } = await authService.loginUser(email, password);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription: user.subscription,
        settings: user.settings,
        performance: user.performance
      },
      token
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 