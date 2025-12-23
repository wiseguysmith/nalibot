import React, { useState, useEffect } from 'react';
import { SaasDashboard } from '../components/SaasDashboard';
import { UserDashboard } from '../components/UserDashboard';
import { AuthModal } from '../components/AuthModal';
import { StrategyBuilder } from '../components/StrategyBuilder';
import { User } from '../services/authService';

export default function SaasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // In a real app, you'd verify the token with the server
      // For now, we'll simulate a logged-in user
      const mockUser: User = {
        id: '1',
        email: 'demo@example.com',
        name: 'Demo User',
        subscription: {
          id: 'pro',
          name: 'pro',
          price: 149,
          maxStrategies: 10,
          maxPortfolio: 100000,
          maxExchanges: 3,
          features: ['Advanced Analytics', 'Priority Support', '10 Active Strategies', 'Performance Fees'],
          performanceFee: 0.10
        },
        apiKeys: [],
        strategies: [
          {
            id: '1',
            name: 'BTC Trend Following',
            type: 'trendFollowing',
            isActive: true,
            parameters: { timeframe: '1h', riskPercent: 2 },
            performance: {
              totalTrades: 45,
              winRate: 73.3,
              profitLoss: 1250,
              sharpeRatio: 1.8,
              maxDrawdown: 8.5
            }
          },
          {
            id: '2',
            name: 'ETH Mean Reversion',
            type: 'meanReversion',
            isActive: true,
            parameters: { timeframe: '4h', riskPercent: 1.5 },
            performance: {
              totalTrades: 32,
              winRate: 68.8,
              profitLoss: 890,
              sharpeRatio: 1.5,
              maxDrawdown: 12.2
            }
          }
        ],
        performance: {
          totalReturn: 18.5,
          monthlyReturn: 3.2,
          sharpeRatio: 1.8,
          maxDrawdown: 8.5,
          winRate: 71.4,
          profitFactor: 2.1
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
      setUser(mockUser);
    }
  }, []);

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('authToken', result.token);
        setUser(result.user);
        setShowAuthModal(false);
      } else {
        alert(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const handleStrategySave = (strategy: any) => {
    // In a real app, you'd save this to the server
    console.log('Saving strategy:', strategy);
    setShowStrategyBuilder(false);
    // You could also update the user's strategies here
  };

  const handleAddStrategy = () => {
    setShowStrategyBuilder(true);
  };

  if (user) {
    return (
      <div>
        <UserDashboard user={user} onLogout={handleLogout} />
        {showStrategyBuilder && (
          <StrategyBuilder
            onSave={handleStrategySave}
            onCancel={() => setShowStrategyBuilder(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <SaasDashboard 
        user={user}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <AuthModal
        isOpen={showAuthModal}
        mode={authMode}
        onClose={() => setShowAuthModal(false)}
        onSwitchMode={setAuthMode}
        onSubmit={handleAuthSubmit}
        isLoading={isLoading}
      />
    </div>
  );
} 