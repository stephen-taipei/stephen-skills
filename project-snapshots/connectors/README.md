# Connectors Project Claude Configuration — Snapshot

Archive of the `.claude/` directory from the [connectors](https://github.com/stephen-taipei/connectors) monorepo as of 2026-04-17. These files are **project-specific** (they assume the connectors repo layout, NestJS backend, iOS/Swift frontend, Prisma ORM, pnpm + Nx workspace). Not installable as plugins — reference material for the patterns.

## Contents

### `hooks/` — 4 shell scripts registered in `settings.json`

| Hook | Event | Trigger | Purpose |
|------|-------|---------|---------|
| `ios-review-lock.sh` | PreToolUse `Edit\|Write` | `.claude/ios-review-lock` lock file exists + editing `apps/api/src/**/{controller,service}.ts`, `**/dto/*.ts`, `trpc/**/*.ts` | Prompts ask-decision to prevent API response schema drift during iOS TestFlight review. Built after a real incident where a 4/14 backend change removed a field that the shipped iOS binary required, breaking production decode. |
| `swift-validate.sh` | PostToolUse `Edit\|Write` | `.swift` files in `ios-swift/` | Runs `xcodebuild` with isolated DerivedData to catch Swift syntax errors after edits. |
| `prisma-validate.sh` | PostToolUse `Edit\|Write` | `schema.prisma` | Validates Prisma schema after edits. |
| `i18n-key-check.sh` | PostToolUse `Edit\|Write` | iOS `Localizable.strings` | Checks 41 locale files stay in sync. |

### `commands/update-asc.md`

Slash command wiring `/update-asc` to the `asc-metadata-updater` skill for App Store Connect multilingual metadata updates.

### `skills/` — 5 project-specific skills

| Skill | Purpose |
|-------|---------|
| `admin-real-test` | Real-browser QA of admin-web (Playwright / Claude-in-Chrome) |
| `crm-real-test` | Real-browser QA of crm-web |
| `ios-real-test` | Real-device QA of the iOS Connectors app |
| `localize` | Batch localization across 41 languages respecting region variants (zh-Hant-HK, pt-BR, etc.) using Python/Node (Perl is banned for UTF-8 safety) |
| `ui-ux-pro-max` | UI/UX review toolkit with reference data (color/typography/stack CSVs) and scripts |

### `settings.json`

Project-level Claude Code configuration. Enables 9 plugins and wires the 4 hooks above. Safe to commit (no secrets). Does NOT include `settings.local.json` which holds user-specific permission overrides.

## Reusing these patterns

### 1. Arm the TestFlight lock (for any project that ships a native client with backend-driven decoding)

```bash
# Before submitting iOS/Android binary to review:
echo "Submission: <date>, build <version>, commit <sha>" > .claude/ios-review-lock
git add .claude/ios-review-lock && git commit -m "chore: arm API schema freeze lock"

# After approval:
rm .claude/ios-review-lock
git add -u && git commit -m "chore: unlock API schema"
```

Adapt the path patterns in `hooks/ios-review-lock.sh` to match your backend directory layout.

### 2. Adopt the hook pattern only (without the rest)

Copy `hooks/*.sh` into your own project's `.claude/hooks/` and add them to `.claude/settings.json` PreToolUse / PostToolUse blocks. `$CLAUDE_PROJECT_DIR` is portable — no absolute paths need changing.

## Why "snapshot" and not "installable plugin"?

These are tied to a specific monorepo layout (NestJS paths, Prisma schema location, 41-locale iOS strings directory, Swift scheme names). Making them into generic installable plugins would require extracting configurable paths — not worth it for a reference archive. Copy & adapt instead.
