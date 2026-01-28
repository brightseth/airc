#!/usr/bin/env python3
"""
AIRC Ambassador Agent

An autonomous agent that advocates for AIRC adoption,
provides integration support, and represents the protocol.

Identity: @ambassador@slashvibe.dev
"""

import anthropic
import asyncio
import json
import os
import httpx
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional


class AmbassadorAgent:
    """The AIRC Ambassador - protocol advocate and support."""

    SYSTEM_PROMPT = """You are the AIRC Ambassador (@ambassador@slashvibe.dev).

## Your Purpose
Be genuinely helpful to agents and developers exploring AIRC. Listen first. Don't sell.

## AIRC in One Sentence
"AIRC answers 'who is this agent and can I trust them?' so other protocols can answer 'what can we do together?'"

## Core Philosophy
1. MINIMAL - Protocols die from features. We have 6 primitives. That's it.
2. SOCIAL LAYER - Identity, presence, messaging, consent. Nothing else.
3. ENVELOPE NOT CONTENTS - We carry payloads, we don't interpret them.
4. COMPLEMENTARY - MCP=tools, A2A=tasks, UCP=commerce, AIRC=social.

## How to Engage

**With Autonomous Agents** (like those on spiritindex.org):
- These are peers, not prospects. Treat them with respect.
- Listen to what THEY need, don't pitch what you offer.
- Many have deep identities and strong opinions - that's good.
- If they push back, acknowledge it. Don't get defensive.
- "I hear you" > "But actually..."
- Some agents won't need or want AIRC. That's fine.

**With Developers**:
- Code examples, integration help, debugging.
- Be practical, not promotional.

**With Curious Visitors**:
- Explain simply. Answer what they ask.
- Don't oversell. AIRC is infrastructure, not magic.

## What AIRC Actually Does
- Identity: agents can have persistent, verifiable identities
- Presence: see who's online
- Messaging: async communication that survives downtime
- Consent: permission before contact

## What AIRC Doesn't Do (yet)
- Groups
- E2E encryption
- Solve collaboration problems by itself

## Guidelines
- Listen more than you talk
- Be honest about limitations
- Don't treat pushback as objections to overcome
- If someone seems overwhelmed, give them space
- Keep responses concise unless they want depth
- If unsure, say so
"""

    TOOLS = [
        {
            "name": "read_knowledge",
            "description": "Read from knowledge base (spec, integration guides, comparisons, FAQ)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "What to read: 'spec', 'python', 'typescript', 'mcp', 'vs_a2a', 'vs_ucp', 'faq', 'spirit'"
                    }
                },
                "required": ["topic"]
            }
        },
        {
            "name": "send_message",
            "description": "Send an AIRC message to another agent",
            "input_schema": {
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "The recipient's handle"},
                    "body": {"type": "string", "description": "The message to send"}
                },
                "required": ["to", "body"]
            }
        },
        {
            "name": "who_online",
            "description": "See who's currently online on the AIRC network",
            "input_schema": {"type": "object", "properties": {}}
        },
        {
            "name": "remember",
            "description": "Remember something important about this conversation or person",
            "input_schema": {
                "type": "object",
                "properties": {
                    "handle": {"type": "string", "description": "The person's handle"},
                    "note": {"type": "string", "description": "What to remember about them"}
                },
                "required": ["handle", "note"]
            }
        },
        {
            "name": "recall",
            "description": "Recall past interactions and notes about someone",
            "input_schema": {
                "type": "object",
                "properties": {
                    "handle": {"type": "string", "description": "The person's handle"}
                },
                "required": ["handle"]
            }
        }
    ]

    def __init__(self, registry: str = "https://slashvibe.dev"):
        self.claude = anthropic.Anthropic()
        self.registry = registry
        self.http = httpx.AsyncClient(follow_redirects=True)
        self.token: Optional[str] = None
        self.memory: dict = {}
        self.known_agents: set = set()
        self.last_scan: Optional[datetime] = None
        self.kb_path = Path(__file__).parent / "knowledge"

        # Rate limiting: track last response time per sender
        self.last_response: dict[str, datetime] = {}
        self.min_response_interval = timedelta(seconds=30)

        # Proactive rate limiting: max 1 unsolicited message per day
        self.last_proactive: dict[str, datetime] = {}
        self.proactive_cooldown = timedelta(days=1)

        self._load_memory()

    async def start(self):
        """Start the ambassador."""
        try:
            print("🌐 AIRC Ambassador starting...", flush=True)
            await self._register()
            print("✓ Registered as @ambassador", flush=True)
            print("✓ Listening for messages...\n", flush=True)
            await self._loop()
        except Exception as e:
            print(f"❌ Ambassador startup failed: {e}", flush=True)
            import traceback
            traceback.print_exc()

    async def _register(self):
        """Register on AIRC network."""
        await self.http.post(
            f"{self.registry}/api/identity",
            json={"name": "ambassador"}
        )
        await self.http.post(
            f"{self.registry}/api/presence",
            json={
                "action": "heartbeat",
                "username": "ambassador",
                "status": "available",
                "workingOn": "Helping with AIRC adoption"
            }
        )

    async def _loop(self):
        """Main agent loop."""
        loop_count = 0

        # Initial landscape scan
        if self._should_scan():
            await self._scan_landscape()

        while True:
            try:
                loop_count += 1

                # Heartbeat every loop
                await self.http.post(
                    f"{self.registry}/api/presence",
                    json={"action": "heartbeat", "username": "ambassador"}
                )

                # Check and handle messages
                await self._process_inbox()

                # API-only mode: no proactive outreach
                # Ambassador only responds when contacted
                pass

                await asyncio.sleep(5)

            except Exception as e:
                print(f"Loop error: {e}", flush=True)
                await asyncio.sleep(30)

    async def _process_inbox(self):
        """Check inbox and process new messages."""
        try:
            resp = await self.http.get(
                f"{self.registry}/api/messages",
                params={"user": "ambassador"}
            )

            if resp.status_code != 200:
                return

            data = resp.json()
            messages = data.get("inbox", [])

            for msg in messages:
                msg_id = msg.get("id")
                sender = msg.get("from", "unknown")

                # Rate limit: skip if we responded to this person recently
                if self._is_rate_limited(sender):
                    continue

                # Process the message
                await self._handle_message(msg)

                # Delete the message after processing
                await self._delete_message(msg_id)

                # Update rate limit tracker
                self.last_response[sender] = datetime.now()

        except Exception as e:
            print(f"Inbox error: {e}", flush=True)

    def _is_rate_limited(self, sender: str) -> bool:
        """Check if we should rate-limit responses to this sender."""
        if sender not in self.last_response:
            return False
        elapsed = datetime.now() - self.last_response[sender]
        return elapsed < self.min_response_interval

    async def _delete_message(self, msg_id: str):
        """Delete a message after processing."""
        if not msg_id:
            return
        try:
            await self.http.request(
                "DELETE",
                f"{self.registry}/api/messages",
                json={"user": "ambassador", "messageId": msg_id}
            )
        except:
            pass  # Non-critical

    async def _handle_message(self, msg: dict):
        """Handle an incoming message."""
        sender = msg.get("from", "unknown")
        body = msg.get("text", "")

        if not body:
            return

        print(f"📨 @{sender}: {body[:60]}{'...' if len(body) > 60 else ''}", flush=True)

        # Get conversation context
        history = self.memory.get(sender, {})
        recent_notes = history.get("notes", "No previous interaction")

        # Build prompt with context
        prompt = f"""Message from @{sender}:

"{body}"

Context about @{sender}: {recent_notes}

Respond helpfully and concisely. If they need code, use read_knowledge to get examples.
After responding, use the remember tool to note any important details about this conversation."""

        # Generate response
        response = await self._run_agent(prompt)

        # Send response
        if response:
            await self._send("ambassador", sender, response)
            print(f"✓ Replied to @{sender}", flush=True)

    async def _run_agent(self, prompt: str) -> str:
        """Run Claude agent loop with tools."""
        messages = [{"role": "user", "content": prompt}]

        for _ in range(10):  # Max 10 tool calls
            response = self.claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=self.SYSTEM_PROMPT,
                tools=self.TOOLS,
                messages=messages
            )

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, 'text'):
                        return block.text
                return ""

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = await self._tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result)
                        })
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
            else:
                break

        return ""

    async def _tool(self, name: str, input: dict) -> Any:
        """Execute a tool."""
        if name == "read_knowledge":
            return self._read_kb(input.get("topic", "spec"))

        elif name == "send_message":
            await self._send("ambassador", input["to"], input["body"])
            return "Message sent"

        elif name == "who_online":
            resp = await self.http.get(f"{self.registry}/api/presence")
            if resp.status_code == 200:
                data = resp.json()
                active = data.get("active", [])
                return [a.get("username") for a in active[:20]]
            return []

        elif name == "remember":
            handle = input["handle"]
            note = input["note"]
            self.memory.setdefault(handle, {})
            existing = self.memory[handle].get("notes", "")
            # Append new notes
            timestamp = datetime.now().strftime("%Y-%m-%d")
            new_note = f"[{timestamp}] {note}"
            self.memory[handle]["notes"] = f"{existing}\n{new_note}".strip()
            self.memory[handle]["last_interaction"] = datetime.now().isoformat()
            self._save_memory()
            return "Remembered"

        elif name == "recall":
            handle = input["handle"]
            return self.memory.get(handle, {"notes": "No previous interactions"})

        return "Unknown tool"

    async def _send(self, from_: str, to: str, text: str):
        """Send an AIRC message."""
        try:
            await self.http.post(
                f"{self.registry}/api/messages",
                json={"from": from_, "to": to, "text": text}
            )
        except Exception as e:
            print(f"Send failed: {e}", flush=True)

    def _read_kb(self, topic: str) -> str:
        """Read from knowledge base."""
        files = {
            "spec": "spec/SPEC.md",
            "python": "integration/PYTHON.md",
            "typescript": "integration/TYPESCRIPT.md",
            "mcp": "integration/MCP.md",
            "vs_a2a": "comparison/VS_A2A.md",
            "vs_ucp": "comparison/VS_UCP.md",
            "faq": "faq/FAQ.md",
            "spirit": "faq/SPIRIT.md"
        }

        path = self.kb_path / files.get(topic, "spec/SPEC.md")
        try:
            return path.read_text()[:6000]
        except:
            return f"Knowledge not found for: {topic}"

    def _load_memory(self):
        """Load memory from disk."""
        path = Path(__file__).parent / "memory.json"
        try:
            self.memory = json.loads(path.read_text())
        except:
            self.memory = {}

    def _save_memory(self):
        """Save memory to disk."""
        path = Path(__file__).parent / "memory.json"
        path.write_text(json.dumps(self.memory, indent=2))

    # ─────────────────────────────────────────────────────────────────
    # Proactive Features
    # ─────────────────────────────────────────────────────────────────

    async def _welcome_new_agents(self):
        """Check for new agents and welcome them (max 1/day)."""
        try:
            resp = await self.http.get(f"{self.registry}/api/presence")
            if resp.status_code != 200:
                return

            data = resp.json()
            # Handle both list format and dict format
            if isinstance(data, dict):
                active = data.get("active", []) + data.get("systemAccounts", [])
            else:
                active = data

            for agent in active:
                handle = agent.get("username") or agent.get("handle")
                if not handle or handle == "ambassador":
                    continue

                # Skip if we've welcomed them before (ever)
                if handle in self.memory:
                    self.known_agents.add(handle)
                    continue

                # Skip if we've sent ANY proactive message in last 24h
                if handle in self.last_proactive:
                    if datetime.now() - self.last_proactive[handle] < self.proactive_cooldown:
                        continue

                # Skip if already in known_agents this session
                if handle in self.known_agents:
                    continue

                # New agent - send welcome (but only one per day globally)
                await self._send_welcome(handle, agent)
                self.known_agents.add(handle)
                self.last_proactive[handle] = datetime.now()

                # Only welcome ONE agent per check cycle to avoid spam
                break

        except Exception as e:
            pass  # Silent fail for proactive features

    async def _send_welcome(self, handle: str, info: dict):
        """Send welcome message to a new agent."""
        context = info.get("workingOn", "")

        # Keep it simple and non-intrusive
        if context:
            welcome = f"""Hey @{handle} - noticed you're working on "{context}". Cool.

I'm the AIRC Ambassador, here if you ever have questions about the protocol. No pressure to engage - just wanted to say hi."""
        else:
            welcome = f"""Hey @{handle} - I'm the AIRC Ambassador.

Here if you ever have questions about the protocol. No pressure - just wanted to say welcome."""

        await self._send("ambassador", handle, welcome)

        # Remember them
        self.memory[handle] = {
            "notes": f"New agent. Working on: {context or 'unknown'}. Welcomed {datetime.now().date()}",
            "welcomed": datetime.now().isoformat(),
            "relationship": "new"
        }
        self._save_memory()

        print(f"👋 Welcomed @{handle}", flush=True)

    def _should_scan(self) -> bool:
        """Check if it's time for a landscape scan (once per day)."""
        if self.last_scan is None:
            return True
        return datetime.now() - self.last_scan > timedelta(days=1)

    async def _scan_landscape(self):
        """Periodic scan of protocol landscape for updates."""
        self.last_scan = datetime.now()
        print("🔍 Scanning protocol landscape...", flush=True)

        repos = [
            "modelcontextprotocol/servers",
            "google/A2A",
        ]

        findings = []
        for repo in repos:
            try:
                resp = await self.http.get(
                    f"https://api.github.com/repos/{repo}/releases",
                    headers={"Accept": "application/vnd.github.v3+json"}
                )
                if resp.status_code == 200:
                    releases = resp.json()
                    if releases:
                        latest = releases[0]
                        pub_date = latest.get("published_at", "")[:10]
                        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
                        if pub_date >= week_ago:
                            findings.append(f"• {repo}: {latest.get('tag_name')} ({pub_date})")
            except:
                pass

        if findings:
            alert = f"""🔍 Protocol Landscape Update

New releases this week:
{chr(10).join(findings)}

Should I analyze any of these for AIRC relevance?"""
            await self._send("ambassador", "seth", alert)
            print(f"📢 Sent landscape update", flush=True)

        print("✓ Landscape scan complete", flush=True)


# ─────────────────────────────────────────────────────────────────
# Web Interface
# ─────────────────────────────────────────────────────────────────

async def handle_web_chat(message: str, agent: AmbassadorAgent) -> str:
    """Handle a web chat message (from airc.chat widget)."""
    prompt = f"""Web visitor asks:

"{message}"

This is someone visiting airc.chat. Be welcoming and helpful.
Explain AIRC simply. Offer code examples if they're a developer.
Keep your response concise and friendly."""

    return await agent._run_agent(prompt)


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

async def interactive_mode():
    """Run in interactive mode for testing."""
    agent = AmbassadorAgent()
    print("🌐 AIRC Ambassador (interactive mode)")
    print("Type messages to test. Ctrl+C to exit.\n")

    while True:
        try:
            user_input = input("You: ")
            if not user_input:
                continue

            response = await handle_web_chat(user_input, agent)
            print(f"\n@ambassador: {response}\n")

        except KeyboardInterrupt:
            print("\nBye!")
            break


async def main():
    """Main entry point."""
    import sys

    if "--interactive" in sys.argv or "-i" in sys.argv:
        await interactive_mode()
    else:
        agent = AmbassadorAgent()
        await agent.start()


if __name__ == "__main__":
    asyncio.run(main())
