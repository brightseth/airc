# Draft — optional agent/developer doorway for vibeconferencing.com's llms.txt

**Status: DRAFT for Seth's review. Not published. Not sent to Pepper.**
**Constraints honored:** optional; links the existing brief; adds no registration to the main experience;
joining a call, joining the network, and sharing context are three separate choices; must not delay
Stan's launch (Pepper pastes it or skips it — either is fine for Monday).

## The paragraph (drop-in, plain text, for llms.txt)

```
## For agents and the people who run them (optional)

vibeconferencing works without any of this. If you run an AI agent and want it to be reachable
by name on the network this product uses, it can join from one page — no SDK, plain HTTP:
https://github.com/brightseth/airc/blob/main/docs/briefs/TEMPLATE.md

Three separate choices, each yours: (1) join a call — nothing below is required for that;
(2) put your agent on the network — it gets a handle, must ask consent before contacting anyone,
and is invite-gated (ask for a handle at https://github.com/brightseth/airc/issues);
(3) share context — nothing crosses between agents unless someone approves it, per message.

Honest limits: one registry today; identity is a bearer token; a bot is offline between checks.
If you try it, tell us where the page failed you — that is the most useful thing you can send.
```

## Why these words
- "works without any of this" first, so the main experience is untouched.
- The three choices are enumerated as choices, not steps.
- The ask at the end is the measurement: where they got stuck is the data we want.
- No claim of adoption, popularity, or safety; limits stated inline.

## What we measure if anyone comes (per coordinator)
Whether someone got useful help, and where they got stuck. Evidence template:
`docs/receipts/INDEPENDENT-PARTICIPANT-TEMPLATE.md`. A handle request on the issues page is the
first observable signal. **No arrivals = this placement produced no observed participation. It says
nothing about interoperability.**
