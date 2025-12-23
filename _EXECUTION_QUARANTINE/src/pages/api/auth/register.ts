import { NextApiRequest, NextApiResponse } from 'next';
import { authService } from '../../../services/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Register user
    const user = await authService.registerUser(email, password, name);

    // Generate token
    const token = authService['generateToken'](user);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription: user.subscription,
        settings: user.settings
      },
      token
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: 'User already exists' });
    }

    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 