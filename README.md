# stephen-skills

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [ไทย](./README.th.md)

Stephen's reusable Agent Skills repository, installable from the same source in both **Claude Code** and **Codex CLI**.

The skills follow the open [Agent Skills](https://agentskills.io) standard and share the same `SKILL.md`. The repo includes marketplace manifests for both CLIs, so no symlink or custom installer is required.

## Installation

### Claude Code

```
/plugin marketplace add stephen-taipei/stephen-skills
/plugin install review-rust-wasm@stephen-skills
```

### Codex CLI

```bash
codex plugin marketplace add stephen-taipei/stephen-skills
```

## Included Skill

| Skill | Purpose |
|---|---|
| [`review-rust-wasm`](plugins/review-rust-wasm) | Finds CPU hotspots in JS/TS projects that are strong Rust/WASM candidates, migrates selected items, runs them in a Web Worker, measures before/after behavior, and generates a PDF acceptance report |

### review-rust-wasm

Six-step workflow:

1. **Scan candidates** using static pre-filtering and explicit decision criteria, including negative indicators
2. **User selection** of the items to migrate
3. **Move to Rust and compile WASM** with golden test data and equivalence tests first
4. **Integrate with Web Worker** so the main thread does not load WASM directly, with a fallback chain
5. **Benchmark** both end-to-end latency and main-thread blocking
6. **Generate a PDF acceptance report** in the language of the original request

Four non-negotiable principles:

- **Benefits must be measured** with every number labeled as measured or unverified
- **Equivalence before performance**
- **A fallback is mandatory**
- **Negative indicators exclude unsuitable candidates**

If nothing qualifies, the skill explicitly reports that Rust/WASM is not justified for the project.

Requirements: Node.js 18+. Steps 3–5 also require the Rust toolchain and wasm-pack. Step 6 requires Playwright, Puppeteer, or system Chrome.

## Repository structure

```text
.
├── .claude-plugin/marketplace.json
├── .agents/plugins/marketplace.json
├── plugins/
│   └── <plugin>/
│       ├── .claude-plugin/plugin.json
│       ├── .codex-plugin/plugin.json
│       ├── marketplace.meta.json
│       └── skills/<skill>/
│           ├── SKILL.md
│           ├── references/
│           ├── scripts/
│           └── assets/
└── scripts/sync-marketplaces.mjs
```

Do not edit the marketplace manifests manually. Regenerate or validate them with:

```bash
node scripts/sync-marketplaces.mjs
node scripts/sync-marketplaces.mjs --check
```

## Adding a Skill

1. Create `plugins/<name>/skills/<name>/SKILL.md`
2. Add `plugins/<name>/.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`
3. Run `node scripts/sync-marketplaces.mjs`
4. Commit and push

Do not add `commands/<name>.md`. Claude Code would register the same name twice because the skill already exists under `skills/<name>/SKILL.md`.

### SKILL.md frontmatter

To remain compatible with Claude and Codex, this repo uses only Agent Skills standard fields:

| Field | Required | Description |
|---|---|---|
| `name` | ✓ | 1–64 characters, lowercase alphanumeric plus hyphens, matching the directory name |
| `description` | ✓ | Up to 1024 characters, including concrete trigger wording |
| `license` | | Example: `MIT` |
| `compatibility` | | Environment requirements, up to 500 characters |
| `metadata` | | Custom key-value metadata |
| `allowed-tools` | | Pre-approved tools |

Claude-specific fields such as `model`, `effort`, and `context: fork` are intentionally not used because they do not apply to Codex and can break standards-based packaging validation.

## License

MIT
