import { NextApiRequest, NextApiResponse } from 'next';
import { telegramService } from '../../../services/telegramService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body;

    let success = false;

    switch (type) {
      case 'trade':
        success = await telegramService.sendTradeNotification(data);
        break;
      
      case 'performance':
        success = await telegramService.sendPerformanceNotification(data);
        break;
      
      case 'alert':
        success = await telegramService.sendAlertNotification(data);
        break;
      
      case 'system':
        const { title, message, priority } = data;
        success = await telegramService.sendSystemNotification(title, message, priority);
        break;
      
      case 'custom':
        const { title: customTitle, message: customMessage, priority: customPriority } = data;
        success = await telegramService.sendCustomMessage(customTitle, customMessage, customPriority);
        break;
      
      case 'welcome':
        success = await telegramService.sendWelcomeMessage(data.username);
        break;
      
      case 'daily_summary':
        success = await telegramService.sendDailySummary(data);
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }

    if (success) {
      res.status(200).json({ success: true, message: 'Notification sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send notification' });
    }

  } catch (error) {
    console.error('Telegram API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 