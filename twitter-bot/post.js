#!/usr/bin/env node
/**
 * AIRC Twitter Bot - Single Tweet Posting
 *
 * Usage:
 *   node post.js "Your tweet text"
 *   node post.js "Tweet with video" --media /path/to/video.mp4
 */

import { TwitterApi } from 'twitter-api-v2';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

// Initialize client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

async function uploadMedia(filePath) {
  const absolutePath = resolve(filePath);
  console.log(`Uploading media: ${absolutePath}`);

  const mediaId = await client.v1.uploadMedia(absolutePath);
  console.log(`Media uploaded: ${mediaId}`);
  return mediaId;
}

async function post(text, mediaPath = null) {
  try {
    const tweetData = { text };

    if (mediaPath) {
      const mediaId = await uploadMedia(mediaPath);
      tweetData.media = { media_ids: [mediaId] };
    }

    const tweet = await client.v2.tweet(tweetData);
    console.log('Tweet posted!');
    console.log(`ID: ${tweet.data.id}`);
    console.log(`URL: https://twitter.com/AIRCprotocol/status/${tweet.data.id}`);
    return tweet;
  } catch (error) {
    console.error('Error posting tweet:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// CLI handling
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node post.js "Tweet text" [--media /path/to/file]');
  process.exit(1);
}

const mediaIndex = args.indexOf('--media');
let text, mediaPath;

if (mediaIndex !== -1) {
  text = args.slice(0, mediaIndex).join(' ');
  mediaPath = args[mediaIndex + 1];
} else {
  text = args.join(' ');
}

post(text, mediaPath);
