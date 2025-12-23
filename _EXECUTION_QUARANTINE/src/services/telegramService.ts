export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface NotificationMessage {
  type: 'trade' | 'performance' | 'alert' | 'system';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
}

export interface TradeNotification {
  pair: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  profit?: number;
  strategy: string;
  timestamp: Date;
}

export interface PerformanceNotification {
  dailyPnL: number;
  totalReturn: number;
  winRate: number;
  activeTrades: number;
  timestamp: Date;
}

export interface AlertNotification {
  type: 'drawdown' | 'profit_target' | 'risk_level' | 'system_error';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

export class TelegramService {
  private config: TelegramConfig;
  private messageQueue: NotificationMessage[] = [];
  private isProcessing = false;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * Send a trade notification
   */
  async sendTradeNotification(trade: TradeNotification): Promise<boolean> {
    const emoji = trade.type === 'BUY' ? '🟢' : '🔴';
    const profitText = trade.profit !== undefined 
      ? `\n💰 Profit: ${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}`
      : '';

    const message: NotificationMessage = {
      type: 'trade',
      title: `${emoji} ${trade.type} ${trade.pair}`,
      message: `Strategy: ${trade.strategy}\nAmount: $${trade.amount}\nPrice: $${trade.price}${profitText}\nTime: ${trade.timestamp.toLocaleTimeString()}`,
      data: trade,
      priority: 'medium'
    };

    return this.sendMessage(message);
  }

  /**
   * Send a performance update
   */
  async sendPerformanceNotification(performance: PerformanceNotification): Promise<boolean> {
    const pnlEmoji = performance.dailyPnL >= 0 ? '📈' : '📉';
    const returnEmoji = performance.totalReturn >= 0 ? '🚀' : '⚠️';

    const message: NotificationMessage = {
      type: 'performance',
      title: `${pnlEmoji} Daily Performance Update`,
      message: `Daily P&L: ${performance.dailyPnL >= 0 ? '+' : ''}$${performance.dailyPnL.toFixed(2)}\nTotal Return: ${performance.totalReturn >= 0 ? '+' : ''}${performance.totalReturn.toFixed(2)}%\nWin Rate: ${performance.winRate.toFixed(1)}%\nActive Trades: ${performance.activeTrades}`,
      data: performance,
      priority: 'low'
    };

    return this.sendMessage(message);
  }

  /**
   * Send an alert notification
   */
  async sendAlertNotification(alert: AlertNotification): Promise<boolean> {
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };

    const message: NotificationMessage = {
      type: 'alert',
      title: `${severityEmoji[alert.severity]} ${alert.type.toUpperCase()}`,
      message: alert.message,
      data: alert,
      priority: alert.severity === 'critical' ? 'high' : 'medium'
    };

    return this.sendMessage(message);
  }

  /**
   * Send a system notification
   */
  async sendSystemNotification(title: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    const notification: NotificationMessage = {
      type: 'system',
      title: `🤖 ${title}`,
      message,
      priority
    };

    return this.sendMessage(notification);
  }

  /**
   * Send a custom message
   */
  async sendCustomMessage(title: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    const notification: NotificationMessage = {
      type: 'system',
      title,
      message,
      priority
    };

    return this.sendMessage(notification);
  }

  /**
   * Core message sending function
   */
  private async sendMessage(notification: NotificationMessage): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('Telegram notifications disabled');
      return false;
    }

    try {
      const text = this.formatMessage(notification);
      
      const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }

      console.log('Telegram notification sent successfully');
      return true;

    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      
      // Add to queue for retry
      this.messageQueue.push(notification);
      
      return false;
    }
  }

  /**
   * Format message for Telegram
   */
  private formatMessage(notification: NotificationMessage): string {
    const priorityEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🔴'
    };

    let formattedMessage = `<b>${priorityEmoji[notification.priority]} ${notification.title}</b>\n\n`;
    formattedMessage += notification.message;

    // Add timestamp
    formattedMessage += `\n\n<code>${new Date().toLocaleString()}</code>`;

    return formattedMessage;
  }

  /**
   * Process queued messages
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.sendMessage(message);
          // Wait 1 second between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TelegramConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TelegramConfig {
    return { ...this.config };
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/getMe`);
      const result = await response.json();
      
      if (result.ok) {
        console.log('Telegram bot connection successful:', result.result.username);
        return true;
      } else {
        console.error('Telegram bot connection failed:', result.description);
        return false;
      }
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  /**
   * Send welcome message
   */
  async sendWelcomeMessage(username: string): Promise<boolean> {
    const message = `🎉 Welcome to AutoBread, ${username}!\n\n` +
                   `Your AI trading bot is now connected and ready to trade.\n\n` +
                   `📊 You'll receive real-time notifications for:\n` +
                   `• Trade executions\n` +
                   `• Performance updates\n` +
                   `• Risk alerts\n` +
                   `• System status\n\n` +
                   `🚀 Let's start making money!`;

    return this.sendCustomMessage('AutoBread Connected', message, 'medium');
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(summary: {
    totalTrades: number;
    winningTrades: number;
    totalPnL: number;
    bestTrade: number;
    worstTrade: number;
    winRate: number;
  }): Promise<boolean> {
    const message = `📊 <b>Daily Trading Summary</b>\n\n` +
                   `Total Trades: ${summary.totalTrades}\n` +
                   `Winning Trades: ${summary.winningTrades}\n` +
                   `Win Rate: ${summary.winRate.toFixed(1)}%\n` +
                   `Total P&L: ${summary.totalPnL >= 0 ? '+' : ''}$${summary.totalPnL.toFixed(2)}\n` +
                   `Best Trade: +$${summary.bestTrade.toFixed(2)}\n` +
                   `Worst Trade: $${summary.worstTrade.toFixed(2)}`;

    return this.sendCustomMessage('Daily Summary', message, 'low');
  }
}

// Default configuration
export const defaultTelegramConfig: TelegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
  enabled: false
};

// Create default instance
export const telegramService = new TelegramService(defaultTelegramConfig); 