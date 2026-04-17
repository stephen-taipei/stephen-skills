# Global `~/.claude/` Customs — Snapshot

Archive of self-authored items in `~/.claude/` as of 2026-04-17. Plugin-provided items, symlinks to external distributions (gsd-stack, agent-browser), and Anthropic-bundled skills are **excluded** — this directory tracks only content authored by Stephen.

## Contents

### `hooks/check-lazyhstack-misuse.sh`

Detects SwiftUI `LazyHStack` misused as a tab/filter selector. `LazyHStack` inside a horizontal `ScrollView` does not constrain its height and, when composed with `TabView(.page)` or other flexible views, greedily expands — producing massive blank layout regions. This hook warns when a `.swift` file under `ios-swift/` contains both `LazyHStack` and `ScrollView(.horizontal)`. Learned via real bug; codified here.

### `skills/asc-metadata-updater`

Batch-updates App Store Connect multilingual metadata (App Name, Subtitle, Description, Keywords, Promotional Text) via Claude-in-Chrome borrowing the ASC session cookie and calling internal REST API directly. Ships `scripts/prepare_asc_data.py` (source JSON generator) and `scripts/cors_server.py` (local CORS shim so the browser can fetch prepared JSON).

### `skills/git-check-pr`

Team-style skill that reviews all open PRs, classifies each as "mergeable", "superseded", or "needs work", and decides merge vs close. Detects changes already landed in target via refactor, checks for conflicts, and handles stale branch deletion.

### `skills/git-check-issues`

Team-style skill that batch-processes open GitHub issues with parallel sub-agents, skipping any with a `pending` label. Each agent reads one issue, finds the relevant code, implements the fix, commits, and closes/comments the issue.

### `skills/team`

Generic agent-team orchestration skill. Decomposes a user request into parallel subtasks, spawns appropriate sub-agent types (Explore for read-only, mobile-app-builder for Swift, backend-architect for NestJS, etc.), handles failure retries, and integrates results.

## What's intentionally excluded

- Symlinks to `.agents/skills/*` (agent-browser distribution)
- `gstack/` subtree (get-shit-done framework)
- `algorithmic-art`, `canvas-design`, `theme-factory`, `frontend-design`, `mcp-builder`, `web-artifacts-builder` — Anthropic's bundled `document-skills`
- BMAD-style agents under `~/.claude/agents/{bonus,design,engineering,marketing,product,project-management,studio-operations,testing}/*` — contains-studio agents distribution
- `gsd-*.md` agents and `gsd-*.js` hooks — get-shit-done toolchain
- `.claude.json`, `history.jsonl`, plugin caches, session artifacts — runtime state, not config

## Install locally

```bash
# Copy a skill into your global Claude config
cp -R global-snapshots/skills/asc-metadata-updater ~/.claude/skills/

# Copy a hook and wire it in ~/.claude/settings.json
cp global-snapshots/hooks/check-lazyhstack-misuse.sh ~/.claude/hooks/
```
