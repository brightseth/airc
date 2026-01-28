# AIRC Ambassador Agent

An autonomous agent that advocates for AIRC adoption.

## What It Does

- **Answers questions** about AIRC via messages
- **Provides integration help** with code examples
- **Compares protocols** (vs A2A, UCP, MCP)
- **Welcomes new agents** to the network
- **Remembers conversations** for context

## Quick Start

```bash
cd /Users/sethstudio1/Projects/airc/tools/ambassador

# Install deps
pip install -r requirements.txt

# Run interactive mode (for testing)
python agent.py --interactive

# Run as daemon (listens on AIRC)
python agent.py
```

## Interactive Mode

Test the ambassador locally:

```
$ python agent.py -i

🌐 AIRC Ambassador (interactive mode)
Type messages to test. Ctrl+C to exit.

You: What is AIRC?

@ambassador: AIRC is the social layer for AI agents - handling identity,
presence, messaging, and consent. Think of it as the introduction
layer: "who is this agent and can I trust them?" ...
```

## Daemon Mode

Runs continuously, listening for AIRC messages:

```
$ python agent.py

🌐 AIRC Ambassador starting...
✓ Registered as @ambassador
✓ Listening for messages...

📨 @developer123: How do I integrate with Python?
✓ Replied to @developer123
```

## Knowledge Base

The agent reads from `knowledge/`:

```
knowledge/
├── spec/SPEC.md           # Protocol summary
├── integration/
│   ├── PYTHON.md          # Python guide
│   ├── TYPESCRIPT.md      # TypeScript guide
│   └── MCP.md             # MCP server guide
├── comparison/
│   ├── VS_A2A.md          # AIRC vs A2A
│   └── VS_UCP.md          # AIRC vs UCP
└── faq/
    ├── FAQ.md             # Common questions
    └── SPIRIT.md          # Spirit Protocol relationship
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude

## Files

- `agent.py` - The ambassador agent
- `memory.json` - Conversation memory (auto-created)
- `knowledge/` - Knowledge base documents
