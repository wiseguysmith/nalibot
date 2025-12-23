#!/usr/bin/env node

/**
 * 🤖 AI Trading Bot - Main Entry Point
 * 
 * This is the central orchestrator that brings together all our trading services.
 * As your CTO, I'm showing you how to create a production-ready main entry point
 * that follows enterprise software architecture patterns.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class AITradingBot {
    constructor() {
        this.isRunning = false;
        this.services = {};
        this.config = this.loadConfig();
        this.setupLogging();
    }

    /**
     * Load configuration from environment variables
     * This is a critical part of production systems - never hardcode config!
     */
    loadConfig() {
        const config = {
            // Exchange configuration
            exchange: process.env.EXCHANGE || 'kucoin',
            apiKey: process.env.KUCOIN_API_KEY || process.env.KRAKEN_API_KEY,
            secretKey: process.env.KUCOIN_SECRET_KEY || process.env.KRAKEN_API_SECRET,
            passphrase: process.env.KUCOIN_PASSPHRASE,
            
            // Trading configuration
            maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN_PERCENTAGE) || 25,
            riskPerTrade: parseFloat(process.env.RISK_PER_TRADE_PERCENTAGE) || 20,
            volatilityLookback: parseInt(process.env.VOLATILITY_LOOKBACK_PERIOD) || 14,
            
            // Notification configuration
            twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
            twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
            twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
            notificationPhone: process.env.NOTIFICATION_PHONE_NUMBER,
            
            // Environment
            environment: process.env.NODE_ENV || 'development',
            isProduction: process.env.NODE_ENV === 'production'
        };

        // Validate critical configuration
        if (!config.apiKey || !config.secretKey) {
            throw new Error('❌ Missing API credentials! Please set up your .env file.');
        }

        return config;
    }

    /**
     * Setup structured logging for production monitoring
     * Good logging is crucial for debugging production issues
     */
    setupLogging() {
        this.logger = {
            info: (message, data = {}) => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] ℹ️  ${message}`, data);
            },
            success: (message, data = {}) => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] ✅ ${message}`, data);
            },
            warning: (message, data = {}) => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] ⚠️  ${message}`, data);
            },
            error: (message, error = null) => {
                const timestamp = new Date().toISOString();
                console.error(`[${timestamp}] ❌ ${message}`, error);
            }
        };
    }

    /**
     * Initialize all trading services
     * This follows the dependency injection pattern for better testability
     */
    async initializeServices() {
        try {
            this.logger.info('🚀 Initializing AI Trading Bot services...');

            // For now, we'll create mock services to demonstrate the architecture
            // In production, these would be real service instances
            this.services.exchange = this.createMockExchange();
            this.services.marketData = this.createMockMarketData();
            this.services.strategy = this.createMockStrategy();
            this.services.riskManager = this.createMockRiskManager();
            this.services.portfolio = this.createMockPortfolio();
            this.services.tradingEngine = this.createMockTradingEngine();
            this.services.notifications = this.createMockNotifications();

            // Test exchange connection
            await this.testExchangeConnection();

            this.logger.success('✅ All services initialized successfully!');
            return true;

        } catch (error) {
            this.logger.error('Failed to initialize services', error);
            throw error;
        }
    }

    /**
     * Create mock services for demonstration
     * In production, these would be real service instances
     */
    createMockExchange() {
        return {
            name: this.config.exchange,
            async getBalance() {
                return [
                    { asset: 'USDT', free: '100.00', total: '100.00' },
                    { asset: 'BTC', free: '0.001', total: '0.001' },
                    { asset: 'ETH', free: '0.01', total: '0.01' }
                ];
            },
            async getTicker(symbol) {
                return {
                    symbol,
                    price: '50000',
                    volume: '1000',
                    change: '2.5'
                };
            }
        };
    }

    createMockMarketData() {
        return {
            async startStreaming() {
                console.log('📊 Market data streaming started (mock)');
            },
            async stop() {
                console.log('📊 Market data streaming stopped (mock)');
            }
        };
    }

    createMockStrategy() {
        return {
            async start() {
                console.log('🧠 Strategy engine started (mock)');
            },
            async stop() {
                console.log('🧠 Strategy engine stopped (mock)');
            }
        };
    }

    createMockRiskManager() {
        return {
            async startMonitoring() {
                console.log('🛡️ Risk management started (mock)');
            },
            async stopMonitoring() {
                console.log('🛡️ Risk management stopped (mock)');
            }
        };
    }

    createMockPortfolio() {
        return {
            async startMonitoring() {
                console.log('💼 Portfolio monitoring started (mock)');
            },
            async stopMonitoring() {
                console.log('💼 Portfolio monitoring stopped (mock)');
            },
            async closeAllPositions() {
                console.log('💼 All positions closed (mock)');
            }
        };
    }

    createMockTradingEngine() {
        return {
            async start() {
                console.log('⚡ Trading engine started (mock)');
            },
            async stop() {
                console.log('⚡ Trading engine stopped (mock)');
            },
            async emergencyStop() {
                console.log('🚨 Emergency stop activated (mock)');
            }
        };
    }

    createMockNotifications() {
        return {
            async start() {
                console.log('📱 Notification service started (mock)');
            },
            async stop() {
                console.log('📱 Notification service stopped (mock)');
            },
            async sendNotification(message) {
                console.log(`📱 Notification: ${message}`);
            }
        };
    }

    /**
     * Test exchange connection before starting trading
     * Always validate connections in production systems
     */
    async testExchangeConnection() {
        try {
            this.logger.info('🔌 Testing exchange connection...');
            
            // Test basic connectivity
            const balance = await this.services.exchange.getBalance();
            this.logger.success('Exchange connection successful', { balance: balance.slice(0, 3) });
            
        } catch (error) {
            this.logger.error('Exchange connection failed', error);
            throw new Error('Cannot start trading without exchange connection');
        }
    }

    /**
     * Start the trading bot
     * This is where the magic happens!
     */
    async start() {
        if (this.isRunning) {
            this.logger.warning('Bot is already running');
            return;
        }

        try {
            this.logger.info('🎯 Starting AI Trading Bot...');
            
            // Initialize services
            await this.initializeServices();
            
            // Start market data streaming
            await this.services.marketData.startStreaming();
            
            // Start strategy execution
            await this.services.strategy.start();
            
            // Start trading engine
            await this.services.tradingEngine.start();
            
            // Start portfolio monitoring
            await this.services.portfolio.startMonitoring();
            
            // Start risk management
            await this.services.riskManager.startMonitoring();
            
            // Start notification system
            await this.services.notifications.start();
            
            this.isRunning = true;
            this.logger.success('🚀 AI Trading Bot is now running!');
            
            // Send startup notification
            await this.services.notifications.sendNotification('🤖 AI Trading Bot started successfully!');
            
        } catch (error) {
            this.logger.error('Failed to start trading bot', error);
            throw error;
        }
    }

    /**
     * Stop the trading bot gracefully
     * Always implement graceful shutdown in production systems
     */
    async stop() {
        if (!this.isRunning) {
            this.logger.warning('Bot is not running');
            return;
        }

        try {
            this.logger.info('🛑 Stopping AI Trading Bot...');
            
            // Stop all services gracefully
            if (this.services.marketData) await this.services.marketData.stop();
            if (this.services.strategy) await this.services.strategy.stop();
            if (this.services.tradingEngine) await this.services.tradingEngine.stop();
            if (this.services.portfolio) await this.services.portfolio.stopMonitoring();
            if (this.services.riskManager) await this.services.riskManager.stopMonitoring();
            if (this.services.notifications) await this.services.notifications.stop();
            
            this.isRunning = false;
            this.logger.success('✅ AI Trading Bot stopped successfully');
            
            // Send shutdown notification
            if (this.services.notifications) {
                await this.services.notifications.sendNotification('🛑 AI Trading Bot stopped');
            }
            
        } catch (error) {
            this.logger.error('Error stopping bot', error);
        }
    }

    /**
     * Get current bot status
     * Essential for monitoring and debugging
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            exchange: this.config.exchange,
            environment: this.config.environment,
            services: Object.keys(this.services).map(name => ({
                name,
                status: this.services[name] ? 'active' : 'inactive'
            })),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Emergency stop - immediately close all positions
     * Critical for risk management
     */
    async emergencyStop() {
        try {
            this.logger.warning('🚨 EMERGENCY STOP ACTIVATED!');
            
            // Immediately stop trading engine
            if (this.services.tradingEngine) {
                await this.services.tradingEngine.emergencyStop();
            }
            
            // Close all open positions
            if (this.services.portfolio) {
                await this.services.portfolio.closeAllPositions();
            }
            
            // Stop the bot
            await this.stop();
            
            // Send emergency notification
            if (this.services.notifications) {
                await this.services.notifications.sendNotification('🚨 EMERGENCY STOP: All positions closed!');
            }
            
        } catch (error) {
            this.logger.error('Emergency stop failed', error);
        }
    }
}

/**
 * CLI Interface
 * This gives users an easy way to control the bot
 */
async function main() {
    const bot = new AITradingBot();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await bot.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await bot.stop();
        process.exit(0);
    });

    // Parse command line arguments
    const command = process.argv[2];
    const modeArg = process.argv.find(arg => arg.startsWith('--mode='));
    const mode = modeArg ? modeArg.split('=')[1] : (process.env.TRADING_MODE || 'real');
    
    // Check if simulation mode is requested
    if (mode === 'simulation' && command === 'start') {
        console.log('\n📊 Simulation mode detected - delegating to paper trading script...\n');
        console.log('💡 Tip: You can also run directly with: npm run paper-trading\n');
        
        // Delegate to TypeScript paper trading script using ts-node
        const { execSync } = require('child_process');
        const scriptPath = path.join(__dirname, 'scripts', 'run-paper-trading.ts');
        
        try {
            // Use ts-node to run the TypeScript script
            execSync(`npx ts-node "${scriptPath}"`, {
                stdio: 'inherit',
                env: { ...process.env, TRADING_MODE: 'simulation' },
                cwd: __dirname
            });
        } catch (error) {
            console.error('\n❌ Failed to start paper trading script');
            console.error('   Make sure ts-node is installed: npm install --save-dev ts-node');
            console.error('   Or run directly: npm run paper-trading\n');
            process.exit(1);
        }
        
        return;
    }
    
    try {
        switch (command) {
            case 'start':
                if (mode === 'simulation') {
                    console.log('⚠️  Simulation mode: Use --mode=simulation with start command');
                    console.log('   Or set TRADING_MODE=simulation in .env');
                    console.log('   Example: node main.js start --mode=simulation\n');
                }
                await bot.start();
                break;
                
            case 'stop':
                await bot.stop();
                break;
                
            case 'status':
                console.log('📊 Bot Status:', JSON.stringify(bot.getStatus(), null, 2));
                break;
                
            case 'emergency':
                await bot.emergencyStop();
                break;
                
            case 'test':
                console.log('🧪 Testing bot initialization...');
                await bot.initializeServices();
                console.log('✅ Bot initialization test successful!');
                break;
                
            default:
                console.log(`
🤖 AI Trading Bot - Command Line Interface

Usage: node main.js [command] [options]

Commands:
  start              - Start the trading bot
  start --mode=simulation  - Start in paper trading mode (simulated execution)
  stop               - Stop the trading bot gracefully
  status             - Show current bot status
  emergency          - Emergency stop (close all positions)
  test               - Test bot initialization

Examples:
  node main.js start
  node main.js start --mode=simulation
  node main.js status
  node main.js emergency

Environment Variables Required:
  KUCOIN_API_KEY (or KRAKEN_API_KEY)
  KUCOIN_SECRET_KEY (or KRAKEN_API_SECRET)
  KUCOIN_PASSPHRASE (for KuCoin)
  
Optional:
  TRADING_MODE=simulation  - Run in paper trading mode (default: real)
  PAPER_TRADING_INITIAL_CAPITAL=100
  PAPER_TRADING_PAIRS=BTC/USD,ETH/USD
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
  MAX_DRAWDOWN_PERCENTAGE, RISK_PER_TRADE_PERCENTAGE

Paper Trading Mode:
  Paper trading uses REAL market data but SIMULATED execution.
  No real orders are placed - perfect for testing strategies safely.
  Use: node main.js start --mode=simulation
  Or: npm run paper-trading

Note: This is currently running in mock mode for demonstration.
To connect to real exchanges, you'll need to implement the actual service classes.
                `);
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the main function if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { AITradingBot };
