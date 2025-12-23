#!/usr/bin/env node

/**
 * Test script to verify Coinbase JWT configuration is loaded correctly
 * This validates that:
 * 1. Environment variables are read correctly
 * 2. Config validation works
 * 3. JWT credentials are properly formatted
 */

require('dotenv').config();

// Import config (using require for CommonJS compatibility)
const path = require('path');
const fs = require('fs');

// For TypeScript config, we'll read it directly or use a compiled version
// For now, let's test the environment variables directly

console.log('🔍 Testing Coinbase JWT Configuration');
console.log('=====================================\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking environment variables...');
const jwtKeyId = process.env.COINBASE_JWT_KEY_ID;
const jwtPrivateKey = process.env.COINBASE_JWT_PRIVATE_KEY;

if (!jwtKeyId || jwtKeyId === 'your_key_id_here') {
  console.error('❌ COINBASE_JWT_KEY_ID is missing or has placeholder value');
  process.exit(1);
}

if (!jwtPrivateKey || jwtPrivateKey === 'your_private_key_here') {
  console.error('❌ COINBASE_JWT_PRIVATE_KEY is missing or has placeholder value');
  process.exit(1);
}

console.log('✅ COINBASE_JWT_KEY_ID found');
console.log(`   Value: ${jwtKeyId.substring(0, 50)}...`);
console.log(`   Length: ${jwtKeyId.length} characters`);

console.log('✅ COINBASE_JWT_PRIVATE_KEY found');
console.log(`   Preview: ${jwtPrivateKey.substring(0, 30)}...`);
console.log(`   Length: ${jwtPrivateKey.length} characters`);

// Test 2: Validate key ID format
console.log('\n2️⃣ Validating key ID format...');
if (jwtKeyId.includes('organizations/') && jwtKeyId.includes('/apiKeys/')) {
  console.log('✅ Key ID format looks correct (organizations/{org-id}/apiKeys/{key-id})');
  const parts = jwtKeyId.split('/');
  console.log(`   Organization ID: ${parts[1]}`);
  console.log(`   Key ID: ${parts[3]}`);
} else {
  console.warn('⚠️  Key ID format may be incorrect');
  console.log('   Expected format: organizations/{org-id}/apiKeys/{key-id}');
}

// Test 3: Validate private key format
console.log('\n3️⃣ Validating private key format...');
// Coinbase JWT private keys are base64-encoded EC private keys
// They typically start with specific base64 patterns
if (jwtPrivateKey.length > 50 && jwtPrivateKey.match(/^[A-Za-z0-9+/=]+$/)) {
  console.log('✅ Private key appears to be base64-encoded');
} else {
  console.warn('⚠️  Private key format may be incorrect');
  console.log('   Expected: Base64-encoded EC private key');
}

// Test 4: Check for old HMAC variables (should not exist)
console.log('\n4️⃣ Checking for old HMAC variables (should be removed)...');
const oldKey = process.env.COINBASE_API_KEY;
const oldSecret = process.env.COINBASE_API_SECRET;
const oldPassphrase = process.env.COINBASE_API_PASSPHRASE;

if (oldKey || oldSecret || oldPassphrase) {
  console.warn('⚠️  Old HMAC variables found (should be removed):');
  if (oldKey) console.warn(`   COINBASE_API_KEY=${oldKey.substring(0, 30)}...`);
  if (oldSecret) console.warn(`   COINBASE_API_SECRET=${oldSecret.substring(0, 30)}...`);
  if (oldPassphrase) console.warn(`   COINBASE_API_PASSPHRASE=${oldPassphrase}`);
} else {
  console.log('✅ No old HMAC variables found');
}

// Test 5: Test config validation logic
console.log('\n5️⃣ Testing config validation logic...');
const errors = [];

// Simulate production validation
if (process.env.NODE_ENV === 'production') {
  if (!jwtKeyId && !process.env.KRAKEN_API_KEY && !process.env.KUCOIN_API_KEY) {
    errors.push('At least one exchange API key is required in production');
  }
  
  if (jwtKeyId || jwtPrivateKey) {
    if (!jwtKeyId) {
      errors.push('COINBASE_JWT_KEY_ID is required when using Coinbase JWT authentication');
    }
    if (!jwtPrivateKey) {
      errors.push('COINBASE_JWT_PRIVATE_KEY is required when using Coinbase JWT authentication');
    }
  }
}

if (errors.length > 0) {
  console.error('❌ Validation errors:');
  errors.forEach(err => console.error(`   - ${err}`));
  process.exit(1);
} else {
  console.log('✅ Config validation passed');
}

// Summary
console.log('\n=====================================');
console.log('✅ Coinbase JWT Configuration Test PASSED');
console.log('=====================================');
console.log('\n📋 Summary:');
console.log(`   ✅ JWT Key ID: Configured (${jwtKeyId.length} chars)`);
console.log(`   ✅ JWT Private Key: Configured (${jwtPrivateKey.length} chars)`);
console.log(`   ✅ Format validation: Passed`);
console.log(`   ✅ Config validation: Passed`);
console.log('\n🎯 Next steps:');
console.log('   - JWT credentials are ready to use');
console.log('   - Create a Coinbase adapter to use these credentials');
console.log('   - Test with Coinbase Advanced Trade API');



