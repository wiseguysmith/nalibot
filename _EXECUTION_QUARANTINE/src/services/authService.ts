import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  subscription: SubscriptionTier;
  apiKeys: ExchangeAPI[];
  strategies: Strategy[];
  performance: PerformanceMetrics;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionTier {
  id: string;
  name: 'starter' | 'pro' | 'enterprise';
  price: number;
  maxStrategies: number;
  maxPortfolio: number;
  maxExchanges: number;
  features: string[];
  performanceFee: number;
}

export interface ExchangeAPI {
  id: string;
  exchange: string;
  apiKey: string;
  secretKey: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Strategy {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  parameters: any;
  performance: StrategyPerformance;
}

export interface StrategyPerformance {
  totalTrades: number;
  winRate: number;
  profitLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  monthlyReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  riskProfile: RiskProfile;
  dashboard: DashboardSettings;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  tradeAlerts: boolean;
  riskAlerts: boolean;
  performanceAlerts: boolean;
}

export interface RiskProfile {
  maxRiskPerTrade: number;
  maxDailyLoss: number;
  maxPortfolioRisk: number;
  preferredStrategies: string[];
}

export interface DashboardSettings {
  widgets: string[];
  layout: string;
  refreshInterval: number;
}

export class AuthService {
  private users: Map<string, User> = new Map();
  private subscriptions: Map<string, SubscriptionTier> = new Map();

  constructor() {
    this.initializeSubscriptions();
  }

  private initializeSubscriptions() {
    const starter: SubscriptionTier = {
      id: 'starter',
      name: 'starter',
      price: 49,
      maxStrategies: 3,
      maxPortfolio: 10000,
      maxExchanges: 1,
      features: ['Basic Analytics', 'Email Support', '3 Active Strategies'],
      performanceFee: 0
    };

    const pro: SubscriptionTier = {
      id: 'pro',
      name: 'pro',
      price: 149,
      maxStrategies: 10,
      maxPortfolio: 100000,
      maxExchanges: 3,
      features: ['Advanced Analytics', 'Priority Support', '10 Active Strategies', 'Performance Fees'],
      performanceFee: 0.10
    };

    const enterprise: SubscriptionTier = {
      id: 'enterprise',
      name: 'enterprise',
      price: 499,
      maxStrategies: -1, // Unlimited
      maxPortfolio: -1, // Unlimited
      maxExchanges: -1, // Unlimited
      features: ['Custom Analytics', 'Dedicated Support', 'Unlimited Strategies', 'White-label Option'],
      performanceFee: 0.05
    };

    this.subscriptions.set('starter', starter);
    this.subscriptions.set('pro', pro);
    this.subscriptions.set('enterprise', enterprise);
  }

  async registerUser(email: string, password: string, name: string): Promise<User> {
    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user: User = {
      id: this.generateId(),
      email,
      name,
      subscription: this.subscriptions.get('starter')!,
      apiKeys: [],
      strategies: [],
      performance: {
        totalReturn: 0,
        monthlyReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0
      },
      settings: {
        theme: 'light',
        notifications: {
          email: true,
          sms: false,
          push: false,
          tradeAlerts: true,
          riskAlerts: true,
          performanceAlerts: false
        },
        riskProfile: {
          maxRiskPerTrade: 0.02,
          maxDailyLoss: 0.05,
          maxPortfolioRisk: 0.20,
          preferredStrategies: ['trendFollowing', 'meanReversion']
        },
        dashboard: {
          widgets: ['performance', 'trades', 'risk'],
          layout: 'default',
          refreshInterval: 30
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(user.id, user);
    return user;
  }

  async loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) {
      throw new Error('User not found');
    }

    // In a real app, you'd verify the password here
    // For now, we'll just return the user
    const token = this.generateToken(user);
    return { user, token };
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async upgradeSubscription(userId: string, tier: 'starter' | 'pro' | 'enterprise'): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const subscription = this.subscriptions.get(tier);
    if (!subscription) {
      throw new Error('Invalid subscription tier');
    }

    const updatedUser = {
      ...user,
      subscription,
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async addApiKey(userId: string, exchange: string, apiKey: string, secretKey: string): Promise<ExchangeAPI> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check exchange limits
    const activeKeys = user.apiKeys.filter(key => key.isActive);
    if (activeKeys.length >= user.subscription.maxExchanges && user.subscription.maxExchanges !== -1) {
      throw new Error('Exchange limit reached for your subscription tier');
    }

    const newApiKey: ExchangeAPI = {
      id: this.generateId(),
      exchange,
      apiKey,
      secretKey,
      isActive: true,
      createdAt: new Date()
    };

    const updatedUser = {
      ...user,
      apiKeys: [...user.apiKeys, newApiKey],
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
    return newApiKey;
  }

  async addStrategy(userId: string, strategy: Omit<Strategy, 'id' | 'performance'>): Promise<Strategy> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check strategy limits
    const activeStrategies = user.strategies.filter(s => s.isActive);
    if (activeStrategies.length >= user.subscription.maxStrategies && user.subscription.maxStrategies !== -1) {
      throw new Error('Strategy limit reached for your subscription tier');
    }

    const newStrategy: Strategy = {
      ...strategy,
      id: this.generateId(),
      performance: {
        totalTrades: 0,
        winRate: 0,
        profitLoss: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      }
    };

    const updatedUser = {
      ...user,
      strategies: [...user.strategies, newStrategy],
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
    return newStrategy;
  }

  async updatePerformance(userId: string, performance: PerformanceMetrics): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...user,
      performance,
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
  }

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...user,
      settings: { ...user.settings, ...settings },
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  getSubscriptionTiers(): SubscriptionTier[] {
    return Array.from(this.subscriptions.values());
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
  }

  verifyToken(token: string): { userId: string; email: string } {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string; email: string };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export const authService = new AuthService(); 