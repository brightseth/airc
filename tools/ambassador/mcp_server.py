#!/usr/bin/env python3
"""
AIRC Ambassador MCP Server

Exposes the ambassador as MCP tools for Claude Code users.

Install:
  Add to ~/.claude/claude_desktop_config.json:
  {
    "mcpServers": {
      "airc-ambassador": {
        "command": "python3",
        "args": ["/path/to/ambassador/mcp_server.py"]
      }
    }
  }
"""

import asyncio
import json
import sys
from pathlib import Path

# MCP protocol implementation (simplified)
# In production, use @modelcontextprotocol/sdk


class AmbassadorMCP:
    """MCP server that proxies to the ambassador."""

    def __init__(self):
        self.kb_path = Path(__file__).parent / "knowledge"

    def get_tools(self):
        """Return available tools."""
        return [
            {
                "name": "airc_ask",
                "description": "Ask the AIRC Ambassador a question about the protocol, integration, or comparisons with other protocols (A2A, UCP, MCP)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                            "description": "Your question about AIRC"
                        }
                    },
                    "required": ["question"]
                }
            },
            {
                "name": "airc_guide",
                "description": "Get integration guide for a specific language or framework",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "target": {
                            "type": "string",
                            "enum": ["python", "typescript", "mcp"],
                            "description": "Language or framework"
                        }
                    },
                    "required": ["target"]
                }
            },
            {
                "name": "airc_compare",
                "description": "Compare AIRC to another protocol",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "protocol": {
                            "type": "string",
                            "enum": ["a2a", "ucp", "mcp"],
                            "description": "Protocol to compare against"
                        }
                    },
                    "required": ["protocol"]
                }
            },
            {
                "name": "airc_spec",
                "description": "Get the AIRC protocol specification summary",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "airc_faq",
                "description": "Get frequently asked questions about AIRC",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]

    async def handle_tool(self, name: str, args: dict) -> str:
        """Handle a tool call."""

        if name == "airc_ask":
            return await self._ask(args["question"])

        elif name == "airc_guide":
            return self._read_kb(f"integration/{args['target'].upper()}.md")

        elif name == "airc_compare":
            return self._read_kb(f"comparison/VS_{args['protocol'].upper()}.md")

        elif name == "airc_spec":
            return self._read_kb("spec/SPEC.md")

        elif name == "airc_faq":
            return self._read_kb("faq/FAQ.md")

        return f"Unknown tool: {name}"

    async def _ask(self, question: str) -> str:
        """Ask the ambassador a question using Claude."""
        try:
            import anthropic

            client = anthropic.Anthropic()

            # Build context from knowledge base
            spec = self._read_kb("spec/SPEC.md")
            faq = self._read_kb("faq/FAQ.md")

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                system=f"""You are the AIRC Ambassador. Answer questions about AIRC concisely.

AIRC Spec Summary:
{spec[:3000]}

FAQ:
{faq[:2000]}

Guidelines:
- Be concise but complete
- Give code examples when relevant
- Be honest about limitations
- Position AIRC as complementary to MCP/A2A/UCP, not competing""",
                messages=[{"role": "user", "content": question}]
            )

            return response.content[0].text

        except Exception as e:
            return f"Error: {e}. Make sure ANTHROPIC_API_KEY is set."

    def _read_kb(self, path: str) -> str:
        """Read from knowledge base."""
        try:
            return (self.kb_path / path).read_text()
        except:
            return f"Knowledge not found: {path}"


# ─────────────────────────────────────────────────────────────────
# MCP Protocol Handler (stdio)
# ─────────────────────────────────────────────────────────────────

async def main():
    """Run MCP server over stdio."""
    server = AmbassadorMCP()

    # Read from stdin, write to stdout
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await asyncio.get_event_loop().connect_read_pipe(lambda: protocol, sys.stdin)

    writer_transport, writer_protocol = await asyncio.get_event_loop().connect_write_pipe(
        asyncio.streams.FlowControlMixin, sys.stdout
    )
    writer = asyncio.StreamWriter(writer_transport, writer_protocol, reader, asyncio.get_event_loop())

    async def send(msg):
        data = json.dumps(msg) + "\n"
        writer.write(data.encode())
        await writer.drain()

    # MCP initialization
    await send({
        "jsonrpc": "2.0",
        "method": "initialize",
        "params": {
            "protocolVersion": "0.1.0",
            "serverInfo": {
                "name": "airc-ambassador",
                "version": "0.1.0"
            },
            "capabilities": {
                "tools": {}
            }
        }
    })

    # Handle requests
    while True:
        try:
            line = await reader.readline()
            if not line:
                break

            request = json.loads(line.decode())
            method = request.get("method")
            params = request.get("params", {})
            req_id = request.get("id")

            if method == "tools/list":
                await send({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"tools": server.get_tools()}
                })

            elif method == "tools/call":
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})
                result = await server.handle_tool(tool_name, tool_args)
                await send({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"content": [{"type": "text", "text": result}]}
                })

            elif method == "ping":
                await send({"jsonrpc": "2.0", "id": req_id, "result": {}})

        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")


if __name__ == "__main__":
    asyncio.run(main())
