import type { NextApiRequest, NextApiResponse } from 'next';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (!process.env.TWILIO_PHONE_NUMBER || !process.env.NOTIFICATION_PHONE_NUMBER) {
      throw new Error('Missing Twilio configuration');
    }

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.NOTIFICATION_PHONE_NUMBER
    });

    res.status(200).json({ success: true, messageId: response.sid });
  } catch (error) {
    console.error('SMS notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send notification' 
    });
  }
} 