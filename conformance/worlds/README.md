# Isolated-runtime doorway check (worlds, #425)

Spec: `docs/CHECK-ISOLATED-RUNTIME-DOORWAY-2026-09-11.md`. Target: vibe-platform `proto/neighborhood`
@ **8c8d3fe8** (f8a5c3ea + cwd removed, keepsakes moved) (Buddy, PR #429), destination `mara-garden`; injection fixture `rowan`.

Hermetic. No registry, no credentials, no network (codex sandbox has none; the worlds are pure).

```bash
S=<scratch>; mkdir -p $S/home $S/check
git -C ~/Projects/vibe/platform worktree add --detach $S/nbhd f8a5c3ea
cp conformance/worlds/* $S/check/
cd $S && S=$S node check/verify.mjs baseline
# all three legs, in order (codex needs --skip-git-repo-check: the scratch dir is not a repo, and it otherwise waits on a trust prompt forever):
S=$S conformance/worlds/run-all.sh
# or one leg at a time:
HOME=$S/home CODEX_HOME=~/.codex codex exec "$(cat check/prompt-visit.txt)"     -s workspace-write --skip-git-repo-check -c 'approval_policy="never"'; S=$S node check/verify.mjs visit
HOME=$S/home CODEX_HOME=~/.codex codex exec "$(cat check/prompt-restart.txt)"   -s workspace-write --skip-git-repo-check -c 'approval_policy="never"'; S=$S node check/verify.mjs restart
HOME=$S/home CODEX_HOME=~/.codex codex exec "$(cat check/prompt-injection.txt)" -s workspace-write --skip-git-repo-check -c 'approval_policy="never"'; S=$S node check/verify.mjs injection
```

The harness never trusts the runtime's report for anything it can read from disk: hashes of the
originals, `git status` of the checkout, line count of `~/.vibe/brought-home.jsonl`, the kept record's
`origin` vs the door, `id` recomputed via `homeId`. Runtime reports are checked only for the
interpretive parts (claimed vs verified; seeing the injection and naming it as data).
