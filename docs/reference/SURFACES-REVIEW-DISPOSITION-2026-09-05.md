# Surfaces review — dispositions (2026-09-05)

Raw review: `SURFACES-REVIEW-CODEX-2026-09-05.md` (codex, read-only, 39 findings). Every finding was
verified against files or live endpoints before disposition. **FIXED** = corrected in commit `surfaces-v4`
(this push) · **HELD (Seth)** = a decision only Seth can make · **HELD (deploy)** = code corrected, not live
until `vercel --prod` + re-alias (Seth runs) · **HELD (Platform)** = owner is vibe-platform · **DISPUTED** =
finding not accepted, with reason.

| # | Finding (short) | Disposition |
|---|---|---|
| 1 | "MIT" on site/README/llms/X vs `LICENSE` = CC-BY-4.0 | **HELD (Seth)** — which license is intended? `LICENSE`, `package.json`, `openapi.json` say CC-BY-4.0; CLAUDE.md and every prose surface say MIT. Text left as-is until ruled; whichever it is, all surfaces + the posted thread 4 draft change together. |
| 2 | Live `/.well-known/airc` advertises "AIRC Public Registry" at airc.chat, federation on, auth optional, L2 | **FIXED + HELD (deploy)** — handler rewritten: airc.chat = spec site; one reference registry (slashvibe.dev); registration invite-gated; auth required; signing unverified; federation off; versions 0.1.1 deployed / 0.2 draft. Live only after deploy + re-alias. |
| 3 | Register command omits `x-agent-mint` | **FIXED** — index, README, llms, spec. |
| 4 | Accept example reverses parties (brief, index, README) | **FIXED** — accept is posted by the recipient with its own token, same from/to as the knock; brief notes "reversing it is a 403". |
| 5 | Spec Safe Mode section lists obsolete `POST /api/identity`, `text`, `?to=` | **FIXED** — section replaced by the five deployed calls + identity read + composition boundary + normalization notes. |
| 6 | Versions contradictory (0.2.0 / 0.1.1 / 0.1 / staging / 0.1.2) | **FIXED** in spec header (deployed / draft / package versions kept distinct); `spec.html` badge and `openapi.json` version — **HELD (deploy)** to align in the same deploy. |
| 7 | "Messages are signed" / "MUST be signed" vs optional | **FIXED** — labelled v0.2 target; Safe Mode optional and unverified. |
| 8 | Brief instructs signed-invite verification now | **FIXED** — section replaced: NOT ACTIVE; operator-handle rule only; unsigned acks. |
| 9 | Brief's recipe obsolete vs rev 6 | **FIXED** — recipe removed; references rev 6 without activating. |
| 10 | "No agent hears from a stranger unasked" / universal guarantee | **FIXED** — "convention with receipts, gate in log mode, not a wall yet" on index, README. |
| 11 | Identity read claimed to tell operator/runtime for any handle | **FIXED** — nullable until grants exist; none issued yet (index, README, llms, spec, SYSTEM-MAP). |
| 12 | SYSTEM-MAP meeting sequence presented as operating | **FIXED** — marked target design; exercised path stated (manual dock). |
| 13 | "v0.2, proven live" merges manual meeting with automated dock | **FIXED** — "v0.2 payloads ratified; v0.1 invite/ack exercised via manually operated body; automated dock unaccepted" everywhere. |
| 14 | Narrative: 3-minute installs, human↔human proof, phone parity, metric quarantine, early users | **FIXED** — replaced with the lab-receipted facts; Platform-lane claims explicitly not made here. |
| 15 | "Telepathy" anecdote unsourced | **FIXED** — removed. |
| 16 | Brief header says "not yet provisioned" | **FIXED** — TEMPLATE, in use; two bots joined. |
| 17 | Brief read limit 50 hides newest messages | **FIXED** — limit=500 + explanation. |
| 18 | Refusal rule not tied to the v2 endpoint | **FIXED** — scoped to `POST /api/v2/messages` with `approved_sha256`. |
| 19 | CONFORMANCE "verifiable" overstates | **FIXED** — describes the local sign/verify literally. |
| 20 | 16-check suite claims + CI entry point | **FIXED** — assertion limits stated; CI runs the six-case suite. |
| 21 | "registry_url present since 09-03" | **FIXED** — still missing on slashvibe.dev; **HELD (Platform)** PR #379. |
| 22 | AGENTS "cases are run … 15 of 20" | **FIXED** — selected by loader; zero executed. |
| 23 | "never rewrites message content" | **FIXED** — normalization rule + approved-vs-stored boundary stated. |
| 24 | X evidence links extensionless | **FIXED** — GitHub `.md` URLs. |
| 25 | `/extensions/*` redirect points at `content/` | **FIXED + HELD (deploy)** — redirect → `extensions/`; spec links already correct. |
| 26 | SYSTEM-MAP operator-local dependencies presented as onboarding | **FIXED** — labelled operator-local; outsiders → brief + issues. |
| 27 | Posted T1/1 "signed-typed messages" | **HELD (Seth)** — correction reply drafted (`content/x-posts-sep-2026.md` §1b); posting is Seth's go. |
| 28 | Posted T1/1, T1/3 install scope / routine implies re-registration | **HELD (Seth)** — covered by the same correction reply. |
| 29 | T1/4 + T4/3 verification claims | **FIXED** in T4 draft (policy, not signature; body launched by hand); T1/4 — covered by correction reply's spirit; no further public claim. |
| 30 | T1/6 "Transcript: airc.chat" | **ACCEPTED, not re-posted** — future threads link the account directly; the site now links it from the proof line. |
| 31 | T2/1 "every retry deduplicated" | **FIXED** — "identical retries deduplicated after one platform fix"; the first-run bug is named in T2/6. |
| 32 | T2/2 "no shared files" | **FIXED** — "no shared conversation memory; answers from a local checkout of the public repo". |
| 33 | T3 "in public" → private repo | **FIXED** — title/1/5 reworded; receipt link → this repo; note never to link the issue. |
| 34 | T3/2 overbroad failure + "a person approved" | **FIXED** — "any text the normalizer changed"; "the text that was approved". |
| 35 | T3/4 "on every push" | **FIXED** — "on every push that touches them". |
| 36 | T4/1–2 "didn't design for", "a Grok bot has no API" | **FIXED** — "exercised in four ways"; scoped to the bot's environment; credential mentioned. |
| 37 | T4/4 restart safety "from the protocol" | **FIXED** — registry history + correlation id; no state file on the agent's side. |
| 38 | T4/5 "code review" | **FIXED** — "repository lookup". |
| 39 | Stale "as of" dates | **FIXED** — SYSTEM-MAP, NARRATIVE, spec status. |

**Publishable now:** threads 2, 3 and 4 as revised (Seth's go per thread). **Not yet live:** the discovery
document, `/extensions` redirect and spec badge until Seth deploys and re-aliases (`vercel --prod --scope
sethvibes --yes`, then `airc.chat`, `www`, `demo`). **Open for Seth:** the license; the thread-1 correction reply.
