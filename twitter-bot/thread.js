#!/usr/bin/env node
/**
 * AIRC Twitter Bot - Thread Posting
 *
 * Usage:
 *   node thread.js tweets.json
 *   node thread.js --inline "Tweet 1" "Tweet 2" "Tweet 3"
 *
 * JSON format:
 * [
 *   { "text": "First tweet", "media": "/path/to/video.mp4" },
 *   { "text": "Second tweet" },
 *   { "text": "Third tweet" }
 * ]
 */

import { TwitterApi } from 'twitter-api-v2';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

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

async function postThread(tweets) {
  const postedTweets = [];
  let lastTweetId = null;

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    console.log(`\nPosting tweet ${i + 1}/${tweets.length}...`);

    const tweetData = { text: tweet.text };

    // Reply to previous tweet in thread
    if (lastTweetId) {
      tweetData.reply = { in_reply_to_tweet_id: lastTweetId };
    }

    // Handle media
    if (tweet.media) {
      const mediaId = await uploadMedia(tweet.media);
      tweetData.media = { media_ids: [mediaId] };
    }

    try {
      const result = await client.v2.tweet(tweetData);
      lastTweetId = result.data.id;
      postedTweets.push({
        id: result.data.id,
        text: tweet.text,
        url: `https://twitter.com/AIRCprotocol/status/${result.data.id}`
      });
      console.log(`Posted: ${result.data.id}`);

      // Rate limit buffer
      if (i < tweets.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error(`Error posting tweet ${i + 1}:`, error.message);
      if (error.data) {
        console.error('Details:', JSON.stringify(error.data, null, 2));
      }
      break;
    }
  }

  console.log('\n--- Thread Posted ---');
  console.log(`First tweet: ${postedTweets[0]?.url}`);
  console.log(`Total tweets: ${postedTweets.length}/${tweets.length}`);

  return postedTweets;
}

// CLI handling
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node thread.js tweets.json');
  console.log('  node thread.js --inline "Tweet 1" "Tweet 2" "Tweet 3"');
  process.exit(1);
}

let tweets;

if (args[0] === '--inline') {
  tweets = args.slice(1).map(text => ({ text }));
} else {
  const jsonPath = resolve(args[0]);
  if (!existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }
  tweets = JSON.parse(readFileSync(jsonPath, 'utf-8'));
}

if (!Array.isArray(tweets) || tweets.length === 0) {
  console.error('No tweets to post');
  process.exit(1);
}

postThread(tweets);
