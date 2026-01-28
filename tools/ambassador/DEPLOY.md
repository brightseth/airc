# Deploying AIRC Ambassador

## Option 1: Fly.io (Recommended)

```bash
cd /Users/sethstudio1/Projects/airc/tools/ambassador

# Install Fly CLI
brew install flyctl

# Login
fly auth login

# Create app (first time only)
fly apps create airc-ambassador

# Set secrets
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
fly deploy

# Check logs
fly logs
```

**URL:** https://airc-ambassador.fly.dev

## Option 2: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Init project
railway init

# Set secrets
railway variables set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
railway up
```

## Option 3: Local with ngrok

```bash
# Terminal 1: Run server
cd /Users/sethstudio1/Projects/airc/tools/ambassador
pip install fastapi uvicorn
python server.py

# Terminal 2: Expose with ngrok
ngrok http 8080
```

## Embedding on airc.chat

Add to your site:

```html
<iframe
  src="https://airc-ambassador.fly.dev"
  width="400"
  height="600"
  style="border: 1px solid #333; border-radius: 12px;"
></iframe>
```

Or use the WebSocket directly:

```javascript
const ws = new WebSocket('wss://airc-ambassador.fly.dev/ws/chat');

ws.onmessage = (e) => {
  const { from, body } = JSON.parse(e.data);
  console.log(`@${from}: ${body}`);
};

ws.send(JSON.stringify({ message: 'What is AIRC?' }));
```

## Health Check

```bash
curl https://airc-ambassador.fly.dev/health
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `PORT` | No | Server port (default: 8080) |
