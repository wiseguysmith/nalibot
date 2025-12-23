#!/usr/bin/env node

const cron = require('node-cron');
const fetch = require('node-fetch');

/**
 * AutoBread Daily Digest Scheduler
 * 
 * This script automatically sends daily digest emails to users at scheduled times.
 * 
 * Usage:
 * node scripts/daily-digest-scheduler.js
 * 
 * Environment Variables:
 * - DIGEST_SCHEDULE: Cron schedule (default: "0 18 * * *" = 6 PM daily)
 * - DIGEST_TIMEZONE: Timezone for scheduling (default: "America/New_York")
 * - API_BASE_URL: Base URL for API calls (default: "http://localhost:3000")
 */

// Configuration
const config = {
  schedule: process.env.DIGEST_SCHEDULE || '0 18 * * *', // 6 PM daily
  timezone: process.env.DIGEST_TIMEZONE || 'America/New_York',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  users: [
    // Add user emails here or fetch from database
    'user1@example.com',
    'user2@example.com'
  ]
};

console.log('📧 AutoBread Daily Digest Scheduler');
console.log('====================================');
console.log(`Schedule: ${config.schedule}`);
console.log(`Timezone: ${config.timezone}`);
console.log(`API Base URL: ${config.apiBaseUrl}`);
console.log(`Users: ${config.users.length}`);
console.log('');

/**
 * Send daily digest to a user
 */
async function sendDailyDigestToUser(userEmail) {
  try {
    console.log(`📧 Sending digest to ${userEmail}...`);
    
    const response = await fetch(`${config.apiBaseUrl}/api/digest/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userEmail: userEmail
        // digestData will be generated automatically by the API
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Digest sent successfully to ${userEmail}`);
      return true;
    } else {
      console.error(`❌ Failed to send digest to ${userEmail}: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error sending digest to ${userEmail}:`, error.message);
    return false;
  }
}

/**
 * Send daily digest to all users
 */
async function sendDailyDigestToAllUsers() {
  console.log(`\n🚀 Starting daily digest for ${new Date().toLocaleDateString()}`);
  console.log('================================================');
  
  const results = {
    total: config.users.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  for (const userEmail of config.users) {
    const success = await sendDailyDigestToUser(userEmail);
    
    if (success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push(userEmail);
    }

    // Add delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n📊 Daily Digest Summary');
  console.log('=======================');
  console.log(`Total Users: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`Failed emails: ${results.errors.join(', ')}`);
  }

  console.log(`\n✅ Daily digest completed at ${new Date().toLocaleTimeString()}`);
}

/**
 * Test digest sending (for manual testing)
 */
async function testDigest() {
  console.log('🧪 Testing daily digest...');
  
  if (config.users.length === 0) {
    console.log('⚠️ No users configured. Add emails to the users array.');
    return;
  }

  await sendDailyDigestToUser(config.users[0]);
}

/**
 * Start the scheduler
 */
function startScheduler() {
  console.log('⏰ Starting daily digest scheduler...');
  
  // Schedule daily digest
  cron.schedule(config.schedule, sendDailyDigestToAllUsers, {
    timezone: config.timezone
  });

  console.log(`✅ Scheduler started. Next digest will be sent at the scheduled time.`);
  console.log(`📅 Schedule: ${config.schedule} (${config.timezone})`);
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n⏹️ Stopping daily digest scheduler...');
    process.exit(0);
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testDigest();
    process.exit(0);
  }
  
  if (args.includes('--send-now')) {
    await sendDailyDigestToAllUsers();
    process.exit(0);
  }
  
  if (args.includes('--help')) {
    console.log(`
AutoBread Daily Digest Scheduler

Usage:
  node scripts/daily-digest-scheduler.js [options]

Options:
  --test        Test sending digest to first user
  --send-now    Send digest to all users immediately
  --help        Show this help message

Environment Variables:
  DIGEST_SCHEDULE    Cron schedule (default: "0 18 * * *")
  DIGEST_TIMEZONE    Timezone (default: "America/New_York")
  API_BASE_URL       API base URL (default: "http://localhost:3000")

Examples:
  node scripts/daily-digest-scheduler.js --test
  node scripts/daily-digest-scheduler.js --send-now
  DIGEST_SCHEDULE="0 9 * * *" node scripts/daily-digest-scheduler.js
    `);
    process.exit(0);
  }
  
  // Start the scheduler
  startScheduler();
}

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  sendDailyDigestToUser,
  sendDailyDigestToAllUsers,
  testDigest,
  startScheduler
}; 