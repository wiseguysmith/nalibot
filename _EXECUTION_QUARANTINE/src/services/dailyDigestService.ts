import nodemailer from 'nodemailer';

export interface DailyDigestData {
  date: string;
  totalBalance: number;
  dailyPnL: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  topPerformingStrategy: {
    name: string;
    pnl: number;
    winRate: number;
  };
  recentTrades: Array<{
    symbol: string;
    type: 'BUY' | 'SELL';
    amount: number;
    price: number;
    profit?: number;
    strategy: string;
    timestamp: Date;
  }>;
  marketSummary: {
    btcChange: number;
    ethChange: number;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
  };
  riskMetrics: {
    currentRisk: number;
    riskLevel: 'low' | 'medium' | 'high';
    dailyLoss: number;
    maxDailyLoss: number;
  };
  insights: string[];
  nextDayOutlook: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class DailyDigestService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport(config);
    this.fromEmail = config.auth.user;
  }

  /**
   * Generate and send daily digest email
   */
  async sendDailyDigest(userEmail: string, digestData: DailyDigestData): Promise<boolean> {
    try {
      const htmlContent = this.generateDigestHTML(digestData);
      const textContent = this.generateDigestText(digestData);

      const mailOptions = {
        from: `"AutoBread Trading Bot" <${this.fromEmail}>`,
        to: userEmail,
        subject: `📊 AutoBread Daily Digest - ${digestData.date}`,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Daily digest sent to ${userEmail}: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send daily digest:', error);
      return false;
    }
  }

  /**
   * Generate HTML email content
   */
  private generateDigestHTML(data: DailyDigestData): string {
    const getPnLColor = (pnl: number) => pnl >= 0 ? '#10B981' : '#EF4444';
    const getRiskColor = (risk: string) => {
      switch (risk) {
        case 'low': return '#10B981';
        case 'medium': return '#F59E0B';
        case 'high': return '#EF4444';
        default: return '#6B7280';
      }
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AutoBread Daily Digest</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .content { padding: 30px; }
          .metric-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
          .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
          .metric { text-align: center; }
          .metric-value { font-size: 24px; font-weight: 700; margin-bottom: 5px; }
          .metric-label { color: #6B7280; font-size: 14px; }
          .section-title { font-size: 20px; font-weight: 600; margin-bottom: 15px; color: #1F2937; }
          .trade-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .trade-item:last-child { border-bottom: none; }
          .trade-symbol { font-weight: 600; color: #1F2937; }
          .trade-details { color: #6B7280; font-size: 14px; }
          .insight-item { background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
          .outlook { background: #fef3c7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 0 8px 8px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
          .btn { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🤖 AutoBread Daily Digest</h1>
            <p>Your automated trading summary for ${data.date}</p>
          </div>
          
          <div class="content">
            <!-- Key Metrics -->
            <div class="metric-grid">
              <div class="metric">
                <div class="metric-value" style="color: ${getPnLColor(data.dailyPnL)}">
                  ${data.dailyPnL >= 0 ? '+' : ''}$${data.dailyPnL.toFixed(2)}
                </div>
                <div class="metric-label">Daily P&L</div>
              </div>
              <div class="metric">
                <div class="metric-value" style="color: ${getPnLColor(data.totalPnL)}">
                  ${data.totalPnL >= 0 ? '+' : ''}$${data.totalPnL.toFixed(2)}
                </div>
                <div class="metric-label">Total P&L</div>
              </div>
              <div class="metric">
                <div class="metric-value">${data.winRate.toFixed(1)}%</div>
                <div class="metric-label">Win Rate</div>
              </div>
              <div class="metric">
                <div class="metric-value">${data.totalTrades}</div>
                <div class="metric-label">Total Trades</div>
              </div>
            </div>

            <!-- Portfolio Summary -->
            <div class="metric-card">
              <div class="section-title">📊 Portfolio Summary</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <div style="font-size: 18px; font-weight: 600; color: #1F2937;">$${data.totalBalance.toFixed(2)}</div>
                  <div style="color: #6B7280; font-size: 14px;">Total Balance</div>
                </div>
                <div>
                  <div style="font-size: 18px; font-weight: 600; color: ${getRiskColor(data.riskMetrics.riskLevel)};">
                    ${data.riskMetrics.riskLevel.toUpperCase()}
                  </div>
                  <div style="color: #6B7280; font-size: 14px;">Risk Level</div>
                </div>
              </div>
            </div>

            <!-- Top Performing Strategy -->
            <div class="metric-card">
              <div class="section-title">🏆 Top Performing Strategy</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 18px; font-weight: 600; color: #1F2937;">${data.topPerformingStrategy.name}</div>
                  <div style="color: #6B7280; font-size: 14px;">Win Rate: ${data.topPerformingStrategy.winRate.toFixed(1)}%</div>
                </div>
                <div style="font-size: 20px; font-weight: 700; color: ${getPnLColor(data.topPerformingStrategy.pnl)};">
                  ${data.topPerformingStrategy.pnl >= 0 ? '+' : ''}$${data.topPerformingStrategy.pnl.toFixed(2)}
                </div>
              </div>
            </div>

            <!-- Recent Trades -->
            <div class="metric-card">
              <div class="section-title">📈 Recent Trades</div>
              ${data.recentTrades.slice(0, 5).map(trade => `
                <div class="trade-item">
                  <div>
                    <div class="trade-symbol">${trade.symbol}</div>
                    <div class="trade-details">${trade.strategy} • ${trade.type} $${trade.amount}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 600; color: #1F2937;">$${trade.price}</div>
                    ${trade.profit !== undefined ? `
                      <div style="color: ${getPnLColor(trade.profit)}; font-size: 14px;">
                        ${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Market Summary -->
            <div class="metric-card">
              <div class="section-title">🌍 Market Summary</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <div style="font-size: 16px; font-weight: 600; color: ${getPnLColor(data.marketSummary.btcChange)};">
                    BTC: ${data.marketSummary.btcChange >= 0 ? '+' : ''}${data.marketSummary.btcChange.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div style="font-size: 16px; font-weight: 600; color: ${getPnLColor(data.marketSummary.ethChange)};">
                    ETH: ${data.marketSummary.ethChange >= 0 ? '+' : ''}${data.marketSummary.ethChange.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div style="margin-top: 10px; padding: 8px 12px; background: #f3f4f6; border-radius: 6px; display: inline-block;">
                <span style="color: #6B7280; font-size: 14px;">Market Sentiment: </span>
                <span style="font-weight: 600; color: #1F2937; text-transform: capitalize;">${data.marketSummary.marketSentiment}</span>
              </div>
            </div>

            <!-- AI Insights -->
            <div class="metric-card">
              <div class="section-title">🧠 AI Insights</div>
              ${data.insights.map(insight => `
                <div class="insight-item">
                  <div style="color: #1F2937;">${insight}</div>
                </div>
              `).join('')}
            </div>

            <!-- Next Day Outlook -->
            <div class="outlook">
              <div style="font-weight: 600; color: #92400E; margin-bottom: 8px;">🔮 Tomorrow's Outlook</div>
              <div style="color: #92400E;">${data.nextDayOutlook}</div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:3000/dashboard" class="btn">View Full Dashboard</a>
            </div>
          </div>

          <div class="footer">
            <p>This email was sent by AutoBread Trading Bot</p>
            <p>Not financial advice. Past performance does not guarantee future results.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content
   */
  private generateDigestText(data: DailyDigestData): string {
    return `
🤖 AutoBread Daily Digest - ${data.date}

📊 PORTFOLIO SUMMARY
Total Balance: $${data.totalBalance.toFixed(2)}
Daily P&L: ${data.dailyPnL >= 0 ? '+' : ''}$${data.dailyPnL.toFixed(2)}
Total P&L: ${data.totalPnL >= 0 ? '+' : ''}$${data.totalPnL.toFixed(2)}
Win Rate: ${data.winRate.toFixed(1)}%
Total Trades: ${data.totalTrades}
Risk Level: ${data.riskMetrics.riskLevel.toUpperCase()}

🏆 TOP PERFORMING STRATEGY
${data.topPerformingStrategy.name}
P&L: ${data.topPerformingStrategy.pnl >= 0 ? '+' : ''}$${data.topPerformingStrategy.pnl.toFixed(2)}
Win Rate: ${data.topPerformingStrategy.winRate.toFixed(1)}%

📈 RECENT TRADES
${data.recentTrades.slice(0, 5).map(trade => 
  `${trade.symbol} ${trade.type} $${trade.amount} @ $${trade.price} (${trade.strategy})${trade.profit !== undefined ? ` - ${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}` : ''}`
).join('\n')}

🌍 MARKET SUMMARY
BTC: ${data.marketSummary.btcChange >= 0 ? '+' : ''}${data.marketSummary.btcChange.toFixed(2)}%
ETH: ${data.marketSummary.ethChange >= 0 ? '+' : ''}${data.marketSummary.ethChange.toFixed(2)}%
Market Sentiment: ${data.marketSummary.marketSentiment}

🧠 AI INSIGHTS
${data.insights.map(insight => `• ${insight}`).join('\n')}

🔮 TOMORROW'S OUTLOOK
${data.nextDayOutlook}

View your full dashboard: http://localhost:3000/dashboard

---
AutoBread Trading Bot
Not financial advice. Past performance does not guarantee future results.
    `;
  }

  /**
   * Generate sample digest data for testing
   */
  generateSampleDigest(): DailyDigestData {
    return {
      date: new Date().toLocaleDateString(),
      totalBalance: 1250.75,
      dailyPnL: 45.20,
      totalPnL: 250.75,
      winRate: 67.3,
      totalTrades: 23,
      maxDrawdown: 8.2,
      sharpeRatio: 1.85,
      topPerformingStrategy: {
        name: 'Mean Reversion',
        pnl: 125.50,
        winRate: 72.5
      },
      recentTrades: [
        {
          symbol: 'BTC/USD',
          type: 'BUY',
          amount: 0.05,
          price: 45000,
          profit: 125.50,
          strategy: 'Mean Reversion',
          timestamp: new Date()
        },
        {
          symbol: 'ETH/USD',
          type: 'SELL',
          amount: 0.8,
          price: 2850,
          profit: -25.30,
          strategy: 'Grid Trading',
          timestamp: new Date()
        }
      ],
      marketSummary: {
        btcChange: 2.5,
        ethChange: -1.2,
        marketSentiment: 'bullish'
      },
      riskMetrics: {
        currentRisk: 45,
        riskLevel: 'medium',
        dailyLoss: 15.20,
        maxDailyLoss: 50.00
      },
      insights: [
        'Mean Reversion strategy performed exceptionally well today with 3 winning trades',
        'Market volatility increased by 15%, consider adjusting position sizes',
        'BTC showing strong support at $44,500 level',
        'Grid trading opportunities detected in ETH/USD pair'
      ],
      nextDayOutlook: 'Expect continued bullish momentum in BTC with potential breakout above $46,000. ETH may consolidate before next move. Consider increasing mean reversion allocation.'
    };
  }
}

// Default email configuration (should be moved to environment variables)
const defaultEmailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'autobread@example.com',
    pass: process.env.EMAIL_PASS || 'your-email-password'
  }
};

export const dailyDigestService = new DailyDigestService(defaultEmailConfig); 