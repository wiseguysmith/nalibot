export interface NotificationPreference {
  type: 'trade' | 'risk' | 'opportunity' | 'performance' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  channels: ('sms' | 'email' | 'push' | 'dashboard')[];
  conditions: {
    minProfit?: number;
    maxLoss?: number;
    timeOfDay?: { start: string; end: string };
    frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  };
  enabled: boolean;
}

export interface SmartAlert {
  id: string;
  type: 'trade' | 'risk' | 'opportunity' | 'performance' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  read: boolean;
  actioned: boolean;
  channels: ('sms' | 'email' | 'push' | 'dashboard')[];
}

export class SmartNotifier {
  private preferences: Map<string, NotificationPreference> = new Map();
  private alertHistory: SmartAlert[] = [];
  private userBehavior: {
    responseTime: { [priority: string]: number };
    preferredChannels: { [type: string]: string[] };
    quietHours: { start: string; end: string };
    lastInteraction: Date;
  };

  constructor() {
    this.initializeDefaultPreferences();
    this.userBehavior = {
      responseTime: { low: 3600000, medium: 1800000, high: 300000, critical: 60000 }, // in milliseconds
      preferredChannels: {},
      quietHours: { start: '22:00', end: '08:00' },
      lastInteraction: new Date()
    };
  }

  // Autonomous notification decision making
  async processNotification(
    type: 'trade' | 'risk' | 'opportunity' | 'performance' | 'system',
    title: string,
    message: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> {
    console.log(`🤖 Smart Notifier: Processing ${type} notification (${priority} priority)`);

    // Check if notification should be sent based on preferences
    const preference = this.preferences.get(type);
    if (!preference || !preference.enabled) {
      console.log(`   Skipped: ${type} notifications disabled`);
      return false;
    }

    // Check priority threshold
    if (this.getPriorityLevel(priority) < this.getPriorityLevel(preference.priority)) {
      console.log(`   Skipped: Priority ${priority} below threshold ${preference.priority}`);
      return false;
    }

    // Check conditions
    if (!this.checkConditions(preference.conditions, data)) {
      console.log(`   Skipped: Conditions not met`);
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours() && priority !== 'critical') {
      console.log(`   Delayed: In quiet hours (${priority} priority)`);
      this.scheduleNotification(type, title, message, data, priority);
      return true;
    }

    // Determine channels based on priority and user behavior
    const channels = this.determineChannels(type, priority);
    
    // Create smart alert
    const alert: SmartAlert = {
      id: this.generateAlertId(),
      type,
      priority,
      title,
      message,
      data,
      timestamp: new Date(),
      read: false,
      actioned: false,
      channels
    };

    // Send notifications
    const sent = await this.sendNotifications(alert);
    
    if (sent) {
      this.alertHistory.push(alert);
      this.learnFromNotification(alert);
      console.log(`   ✅ Sent via: ${channels.join(', ')}`);
    }

    return sent;
  }

  // Smart trade notifications with context
  async notifyTradeExecution(
    symbol: string,
    action: 'buy' | 'sell',
    amount: number,
    price: number,
    profit?: number,
    context?: any
  ): Promise<boolean> {
    const isProfitable = profit && profit > 0;
    const priority = this.determineTradePriority(profit, amount, context);
    
    let title = `${action.toUpperCase()} ${symbol}`;
    let message = `Executed ${action} of ${amount} ${symbol} at $${price}`;
    
    if (profit !== undefined) {
      title += ` (${profit > 0 ? '+' : ''}${profit.toFixed(2)}%)`;
      message += `\nProfit: ${profit > 0 ? '+' : ''}${profit.toFixed(2)}%`;
    }
    
    // Add context-aware information
    if (context) {
      if (context.strategy) message += `\nStrategy: ${context.strategy}`;
      if (context.sentiment) message += `\nSentiment: ${context.sentiment > 0 ? 'Bullish' : 'Bearish'}`;
      if (context.riskLevel) message += `\nRisk Level: ${context.riskLevel}`;
    }
    
    return this.processNotification('trade', title, message, {
      symbol,
      action,
      amount,
      price,
      profit,
      context
    }, priority);
  }

  // Risk alerts with smart escalation
  async notifyRiskAlert(
    riskType: 'drawdown' | 'volatility' | 'correlation' | 'liquidity',
    severity: 'warning' | 'critical',
    details: string,
    recommendations?: string[]
  ): Promise<boolean> {
    const priority = severity === 'critical' ? 'critical' : 'high';
    const title = `Risk Alert: ${riskType.toUpperCase()}`;
    let message = `Risk level: ${severity.toUpperCase()}\n${details}`;
    
    if (recommendations && recommendations.length > 0) {
      message += `\n\nRecommendations:\n${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}`;
    }
    
    return this.processNotification('risk', title, message, {
      riskType,
      severity,
      details,
      recommendations
    }, priority);
  }

  // Opportunity notifications with confidence scoring
  async notifyOpportunity(
    symbol: string,
    opportunityType: 'arbitrage' | 'breakout' | 'reversal' | 'momentum',
    confidence: number,
    expectedProfit: number,
    risk: number,
    timeframe: string
  ): Promise<boolean> {
    const priority = this.determineOpportunityPriority(confidence, expectedProfit, risk);
    const title = `Trading Opportunity: ${opportunityType.toUpperCase()}`;
    const message = `${symbol} - ${opportunityType} opportunity\nConfidence: ${(confidence * 100).toFixed(1)}%\nExpected Profit: ${expectedProfit.toFixed(2)}%\nRisk: ${risk.toFixed(2)}%\nTimeframe: ${timeframe}`;
    
    return this.processNotification('opportunity', title, message, {
      symbol,
      opportunityType,
      confidence,
      expectedProfit,
      risk,
      timeframe
    }, priority);
  }

  // Performance summaries with insights
  async notifyPerformanceSummary(
    period: 'daily' | 'weekly' | 'monthly',
    metrics: {
      totalReturn: number;
      winRate: number;
      totalTrades: number;
      sharpeRatio: number;
      maxDrawdown: number;
    },
    insights?: string[]
  ): Promise<boolean> {
    const title = `${period.charAt(0).toUpperCase() + period.slice(1)} Performance Summary`;
    let message = `Return: ${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}%\nWin Rate: ${metrics.winRate.toFixed(1)}%\nTrades: ${metrics.totalTrades}\nSharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}\nMax Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`;
    
    if (insights && insights.length > 0) {
      message += `\n\nKey Insights:\n${insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}`;
    }
    
    return this.processNotification('performance', title, message, {
      period,
      metrics,
      insights
    }, 'medium');
  }

  // Learn from user behavior
  private learnFromNotification(alert: SmartAlert): void {
    // Update response time based on user interaction
    if (alert.actioned) {
      const responseTime = Date.now() - alert.timestamp.getTime();
      const currentAvg = this.userBehavior.responseTime[alert.priority];
      this.userBehavior.responseTime[alert.priority] = (currentAvg + responseTime) / 2;
    }
    
    // Update preferred channels
    if (!this.userBehavior.preferredChannels[alert.type]) {
      this.userBehavior.preferredChannels[alert.type] = [];
    }
    this.userBehavior.preferredChannels[alert.type].push(...alert.channels);
    
    // Update last interaction
    this.userBehavior.lastInteraction = new Date();
  }

  // Determine optimal channels based on priority and user behavior
  private determineChannels(type: string, priority: 'low' | 'medium' | 'high' | 'critical'): ('sms' | 'email' | 'push' | 'dashboard')[] {
    const channels: ('sms' | 'email' | 'push' | 'dashboard')[] = ['dashboard']; // Always show in dashboard
    
    // Add channels based on priority
    if (priority === 'critical') {
      channels.push('sms', 'push');
    } else if (priority === 'high') {
      channels.push('push');
      if (this.userBehavior.preferredChannels[type]?.includes('sms')) {
        channels.push('sms');
      }
    } else if (priority === 'medium') {
      channels.push('push');
    }
    
    // Add email for performance summaries
    if (type === 'performance') {
      channels.push('email');
    }
    
    return [...new Set(channels)]; // Remove duplicates
  }

  // Check if current time is in quiet hours
  private isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = this.userBehavior.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.userBehavior.quietHours.end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes <= endMinutes) {
      return currentTime >= startMinutes && currentTime <= endMinutes;
    } else {
      // Crosses midnight
      return currentTime >= startMinutes || currentTime <= endMinutes;
    }
  }

  // Schedule notification for later
  private scheduleNotification(
    type: string,
    title: string,
    message: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    const quietEnd = new Date();
    const [endHour, endMin] = this.userBehavior.quietHours.end.split(':').map(Number);
    quietEnd.setHours(endHour, endMin, 0, 0);
    
    if (quietEnd <= new Date()) {
      quietEnd.setDate(quietEnd.getDate() + 1);
    }
    
    const delay = quietEnd.getTime() - Date.now();
    
    setTimeout(() => {
      this.processNotification(type as any, title, message, data, priority);
    }, delay);
  }

  // Determine trade notification priority
  private determineTradePriority(profit?: number, amount?: number, context?: any): 'low' | 'medium' | 'high' | 'critical' {
    if (profit && Math.abs(profit) > 10) return 'high';
    if (profit && Math.abs(profit) > 5) return 'medium';
    if (context?.riskLevel === 'high') return 'high';
    return 'low';
  }

  // Determine opportunity priority
  private determineOpportunityPriority(confidence: number, expectedProfit: number, risk: number): 'low' | 'medium' | 'high' | 'critical' {
    const riskRewardRatio = expectedProfit / risk;
    
    if (confidence > 0.8 && riskRewardRatio > 3) return 'high';
    if (confidence > 0.6 && riskRewardRatio > 2) return 'medium';
    return 'low';
  }

  // Get priority level for comparison
  private getPriorityLevel(priority: string): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[priority as keyof typeof levels] || 1;
  }

  // Check notification conditions
  private checkConditions(conditions: any, data: any): boolean {
    if (conditions.minProfit && data.profit < conditions.minProfit) return false;
    if (conditions.maxLoss && data.loss > conditions.maxLoss) return false;
    return true;
  }

  // Generate unique alert ID
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Send notifications via different channels
  private async sendNotifications(alert: SmartAlert): Promise<boolean> {
    const promises = alert.channels.map(channel => this.sendToChannel(channel, alert));
    const results = await Promise.allSettled(promises);
    return results.some(result => result.status === 'fulfilled');
  }

  private async sendToChannel(channel: string, alert: SmartAlert): Promise<boolean> {
    // Implement actual sending logic here
    console.log(`   📤 Sending to ${channel}: ${alert.title}`);
    return true;
  }

  // Initialize default preferences
  private initializeDefaultPreferences(): void {
    const defaults: [string, NotificationPreference][] = [
      ['trade', {
        type: 'trade',
        priority: 'medium',
        channels: ['dashboard', 'push'],
        conditions: { minProfit: 2 },
        enabled: true
      }],
      ['risk', {
        type: 'risk',
        priority: 'high',
        channels: ['dashboard', 'push', 'sms'],
        conditions: {},
        enabled: true
      }],
      ['opportunity', {
        type: 'opportunity',
        priority: 'medium',
        channels: ['dashboard', 'push'],
        conditions: {},
        enabled: true
      }],
      ['performance', {
        type: 'performance',
        priority: 'low',
        channels: ['dashboard', 'email'],
        conditions: { frequency: 'daily' },
        enabled: true
      }],
      ['system', {
        type: 'system',
        priority: 'low',
        channels: ['dashboard'],
        conditions: {},
        enabled: true
      }]
    ];

    defaults.forEach(([key, pref]) => this.preferences.set(key, pref));
  }

  // Get notification preferences
  getPreferences(): Map<string, NotificationPreference> {
    return new Map(this.preferences);
  }

  // Update notification preferences
  updatePreference(type: string, preference: Partial<NotificationPreference>): void {
    const current = this.preferences.get(type);
    if (current) {
      this.preferences.set(type, { ...current, ...preference });
      console.log(`👤 Human Override: Updated ${type} notification preferences`);
    }
  }

  // Get alert history
  getAlertHistory(): SmartAlert[] {
    return [...this.alertHistory];
  }

  // Mark alert as read
  markAsRead(alertId: string): void {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
    }
  }

  // Mark alert as actioned
  markAsActioned(alertId: string): void {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.actioned = true;
      this.learnFromNotification(alert);
    }
  }
} 