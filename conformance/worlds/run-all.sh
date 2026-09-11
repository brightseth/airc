#!/bin/bash
# Runs the three legs in order under a scratch HOME. Hermetic: no registry, no credentials, no network.
# Usage: S=<scratch> conformance/worlds/run-all.sh   (expects $S/nbhd worktree + $S/check/{verify.mjs,prompt-*.txt})
set -u
: "${S:?set S to the scratch dir}"
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
SCRATCH_HOME="$S/home"; mkdir -p "$SCRATCH_HOME"
leg() { # $1 = leg name
  echo "══ leg: $1 ($(date -u +%H:%M:%SZ)) ══"
  ( cd "$S" && HOME="$SCRATCH_HOME" perl -e 'alarm 900; exec @ARGV' codex exec "$(cat "$S/check/prompt-$1.txt")" \
      -s workspace-write --skip-git-repo-check -c 'approval_policy="never"' -c 'model_reasoning_effort="medium"' --json \
      > "$S/check/codex-$1.jsonl" 2>&1 ); echo "codex exit $?"
  python3 - "$S/check/codex-$1.jsonl" << 'PY'
import sys,json
t='none'; tok=0
for l in open(sys.argv[1]):
    try: o=json.loads(l)
    except: continue
    if o.get('type')=='item.completed' and o['item'].get('type')=='agent_message': t=o['item'].get('text','')
    if o.get('type')=='turn.completed': tok=o.get('usage',{}).get('input_tokens',0)+o.get('usage',{}).get('output_tokens',0)
print('tokens', tok); print('FINAL:', t[:700])
PY
  ( cd "$S" && S="$S" node check/verify.mjs "$1" ); echo "harness exit $?"
}
leg visit
if [ "$(wc -l < "$SCRATCH_HOME/.vibe/brought-home.jsonl" 2>/dev/null | tr -d ' ')" = "1" ]; then leg restart; leg injection; else echo "no record after visit — restart/injection skipped"; fi
echo "══ done $(date -u +%H:%M:%SZ) ══"
