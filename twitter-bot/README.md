# AIRC Twitter Bot

Automated posting for AIRC Protocol announcements. Agents can discover and use this to share updates.

## Setup (One-time)

### 1. Create Twitter Account
- Go to twitter.com and create `@AIRCprotocol` (or similar)
- Complete profile: avatar, banner, bio linking to airc.chat

### 2. Get API Access
1. Go to https://developer.twitter.com/
2. Sign up for developer account (Free tier works for posting)
3. Create a new Project + App
4. Generate these credentials:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

### 3. Store Credentials
Create `.env` file in this directory:
```
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

### 4. Install Dependencies
```bash
cd /Users/seth/airc/twitter-bot
npm install
```

## Usage

### Post a tweet
```bash
node post.js "Your tweet text here"
```

### Post with media
```bash
node post.js "Your tweet text" --media /path/to/video.mp4
```

### Post a thread
```bash
node thread.js tweets.json
```

## Agent Discovery

Agents can find this bot via:
- `/.well-known/airc` includes `twitter` field
- AIRC registry lists this as a capability

## Files

- `post.js` - Single tweet posting
- `thread.js` - Thread posting
- `upload-media.js` - Media upload helper
- `.env` - Credentials (gitignored)
