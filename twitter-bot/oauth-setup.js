#!/usr/bin/env node
/**
 * OAuth flow to get Access Tokens for @aircchat
 *
 * Usage:
 *   1. Set TWITTER_API_KEY and TWITTER_API_SECRET in .env
 *   2. Run: node oauth-setup.js
 *   3. Open the URL in browser, sign in as @aircchat
 *   4. Enter the PIN
 *   5. Copy the tokens to .env
 */

import { TwitterApi } from 'twitter-api-v2';
import { config } from 'dotenv';
import { createInterface } from 'readline';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('\n❌ Missing TWITTER_API_KEY or TWITTER_API_SECRET in .env\n');
    console.log('Add these to /Users/seth/airc/twitter-bot/.env:');
    console.log('TWITTER_API_KEY=your_key_here');
    console.log('TWITTER_API_SECRET=your_secret_here\n');
    process.exit(1);
  }

  console.log('\n🔑 Starting OAuth flow for @aircchat...\n');

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
  });

  try {
    // Get request token with PIN-based OAuth (out-of-band)
    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink('oob');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n1. Open this URL in your browser:\n');
    console.log(`   ${url}\n`);
    console.log('2. Sign in as @aircchat (sign out of @seth first if needed)');
    console.log('3. Click "Authorize app"');
    console.log('4. Copy the PIN shown\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const pin = await question('Enter the PIN: ');

    // Exchange for access tokens
    const { accessToken, accessSecret, screenName, userId } = await client.login(pin.trim());

    console.log(`\n✅ Success! Authorized as @${screenName} (ID: ${userId})\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAdd these to your .env file:\n');
    console.log(`TWITTER_ACCESS_TOKEN=${accessToken}`);
    console.log(`TWITTER_ACCESS_SECRET=${accessSecret}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Your complete .env should look like:\n');
    console.log(`TWITTER_API_KEY=${apiKey}`);
    console.log(`TWITTER_API_SECRET=${apiSecret}`);
    console.log(`TWITTER_ACCESS_TOKEN=${accessToken}`);
    console.log(`TWITTER_ACCESS_SECRET=${accessSecret}`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ OAuth failed:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    console.log('\nMake sure:');
    console.log('1. Your app has OAuth 1.0a enabled');
    console.log('2. App permissions are set to "Read and write"');
    console.log('3. Callback URL is set (can be https://airc.chat)\n');
  }

  rl.close();
}

main();
