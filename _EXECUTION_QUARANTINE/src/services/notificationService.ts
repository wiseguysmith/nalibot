import axios from 'axios';

export enum NotificationType {
  TRADE_EXECUTION = 'TRADE_EXECUTION',
  TRADE_OPPORTUNITY = 'TRADE_OPPORTUNITY',
  PRICE_ALERT = 'PRICE_ALERT',
  RISK_ALERT = 'RISK_ALERT',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  ARBITRAGE_OPPORTUNITY = 'ARBITRAGE_OPPORTUNITY'
}

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipient: string;
  };
  telegram?: {
    enabled: boolean;
    chatId: string;
    botToken: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl: string;
  };
  pushover?: {
    enabled: boolean;
    userKey: string;
    appToken: string;
  };
  browserNotifications: boolean;
}

export class NotificationService {
  private config: NotificationConfig = {
    email: {
      enabled: false,
      recipient: ''
    },
    telegram: {
      enabled: false,
      chatId: '',
      botToken: ''
    },
    discord: {
      enabled: false,
      webhookUrl: ''
    },
    pushover: {
      enabled: false,
      userKey: '',
      appToken: ''
    },
    browserNotifications: true
  };

  constructor(config?: Partial<NotificationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async sendNotification(
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    try {
      const promises: Promise<any>[] = [];

      // Browser notifications
      if (this.config.browserNotifications && typeof window !== 'undefined') {
        this.sendBrowserNotification(title, message);
      }

      // Email notification
      if (this.config.email?.enabled) {
        promises.push(this.sendEmailNotification(title, message, data));
      }

      // Telegram notification
      if (this.config.telegram?.enabled) {
        promises.push(this.sendTelegramNotification(title, message));
      }

      // Discord notification
      if (this.config.discord?.enabled) {
        promises.push(this.sendDiscordNotification(title, message, data));
      }

      // Pushover notification
      if (this.config.pushover?.enabled) {
        promises.push(this.sendPushoverNotification(title, message));
      }

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  // Notify about a new trade execution
  async notifyTradeExecution(symbol: string, action: 'buy' | 'sell', amount: number, price: number, profit?: number): Promise<boolean> {
    const title = `Trade Executed: ${action.toUpperCase()} ${symbol}`;
    const message = `${action.toUpperCase()} ${amount} ${symbol} at price $${price}${profit ? ` with profit: $${profit.toFixed(2)}` : ''}`;
    
    return this.sendNotification(NotificationType.TRADE_EXECUTION, title, message, {
      symbol, action, amount, price, profit, timestamp: new Date()
    });
  }

  // Notify about a potential trade opportunity
  async notifyTradeOpportunity(symbol: string, action: 'buy' | 'sell', reason: string): Promise<boolean> {
    const title = `Trading Opportunity: ${symbol}`;
    const message = `Potential ${action.toUpperCase()} opportunity for ${symbol}. Reason: ${reason}`;
    
    return this.sendNotification(NotificationType.TRADE_OPPORTUNITY, title, message, {
      symbol, action, reason, timestamp: new Date()
    });
  }

  // Notify about an arbitrage opportunity
  async notifyArbitrageOpportunity(route: string[], profit: number, gasFees: number): Promise<boolean> {
    const title = `Arbitrage Opportunity`;
    const message = `Potential ${profit.toFixed(2)}% profit via ${route.join(' → ')}. Gas fees: $${gasFees.toFixed(2)}`;
    
    return this.sendNotification(NotificationType.ARBITRAGE_OPPORTUNITY, title, message, {
      route, profit, gasFees, timestamp: new Date()
    });
  }

  // Notify about a price alert
  async notifyPriceAlert(symbol: string, price: number, condition: string, target: number): Promise<boolean> {
    const title = `Price Alert: ${symbol}`;
    const message = `${symbol} price ${condition} $${target}: Current price $${price}`;
    
    return this.sendNotification(NotificationType.PRICE_ALERT, title, message, {
      symbol, price, condition, target, timestamp: new Date()
    });
  }

  // Notify about a risk alert
  async notifyRiskAlert(message: string, level: 'warning' | 'critical'): Promise<boolean> {
    const title = `Risk Alert: ${level.toUpperCase()}`;
    
    return this.sendNotification(NotificationType.RISK_ALERT, title, message, {
      level, timestamp: new Date()
    });
  }

  // Helper methods for different notification channels
  private sendBrowserNotification(title: string, message: string): void {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body: message });
          }
        });
      }
    }
  }

  private async sendEmailNotification(title: string, message: string, data?: any): Promise<any> {
    // This would integrate with an email service like SendGrid, Mailgun, etc.
    // For now it's a placeholder
    console.log(`Would send email: ${title} - ${message}`);
    return Promise.resolve();
  }

  private async sendTelegramNotification(title: string, message: string): Promise<any> {
    if (!this.config.telegram) return Promise.resolve();
    
    const { botToken, chatId } = this.config.telegram;
    const text = `*${title}*\n${message}`;
    
    return axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      }
    );
  }

  private async sendDiscordNotification(title: string, message: string, data?: any): Promise<any> {
    if (!this.config.discord?.webhookUrl) return Promise.resolve();
    
    const embed = {
      title,
      description: message,
      color: this.getColorForNotificationType(data?.type || ''),
      timestamp: new Date().toISOString(),
      fields: data ? Object.entries(data).map(([key, value]) => ({
        name: key,
        value: String(value),
        inline: true
      })) : []
    };
    
    return axios.post(this.config.discord.webhookUrl, {
      embeds: [embed]
    });
  }

  private async sendPushoverNotification(title: string, message: string): Promise<any> {
    if (!this.config.pushover) return Promise.resolve();
    
    const { userKey, appToken } = this.config.pushover;
    
    return axios.post('https://api.pushover.net/1/messages.json', {
      token: appToken,
      user: userKey,
      title,
      message
    });
  }

  private getColorForNotificationType(type: string): number {
    switch (type) {
      case NotificationType.TRADE_EXECUTION: return 0x00ff00; // Green
      case NotificationType.TRADE_OPPORTUNITY: return 0x0000ff; // Blue
      case NotificationType.PRICE_ALERT: return 0xffff00; // Yellow
      case NotificationType.RISK_ALERT: return 0xff0000; // Red
      case NotificationType.SYSTEM_ALERT: return 0xff00ff; // Purple
      case NotificationType.ARBITRAGE_OPPORTUNITY: return 0x00ffff; // Cyan
      default: return 0xffffff; // White
    }
  }

  setConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }
} 