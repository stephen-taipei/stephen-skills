# stephen-skills

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [ไทย](./README.th.md)

Stephen が日常的に使う Agent Skills を、同じソースから **Claude Code** と **Codex CLI** の両方へインストールできるリポジトリです。

Skill は [Agent Skills](https://agentskills.io) のオープン標準に従い、両方で同じ `SKILL.md` を共有します。Repo には両 CLI 向け marketplace manifest が含まれているため、symlink や独自 installer は不要です。

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
| [`review-rust-wasm`](plugins/review-rust-wasm) | JS/TS プロジェクトから Rust/WASM 化に適した CPU hotspot を見つけ、選択項目を移行し、Web Worker で実行し、前後差を測定して PDF acceptance report を生成します |

### review-rust-wasm

6 ステップ:

1. **候補スキャン**。静的 pre-filter と明示的な判定基準、negative indicators を使用
2. **ユーザー選択**
3. **Rust へ移行して WASM をビルド**。golden test data と equivalence test を先に用意
4. **Web Worker 統合**。main thread では WASM を直接読み込まず fallback chain を用意
5. **Benchmark**。end-to-end latency と main-thread blocking を測定
6. **PDF acceptance report** を元の質問言語で生成

原則:

- **効果は必ず測定**
- **性能より等価性を優先**
- **fallback は必須**
- **negative indicator に該当した候補は除外**

適合する候補がなければ、Rust/WASM を導入する価値がないことを明示します。

要件: Node.js 18+。Step 3–5 は Rust toolchain と wasm-pack、Step 6 は Playwright、Puppeteer、または system Chrome が必要です。

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

Marketplace manifest は手動編集せず、以下を使用します。

```bash
node scripts/sync-marketplaces.mjs
node scripts/sync-marketplaces.mjs --check
```

## Skill を追加する

1. `plugins/<name>/skills/<name>/SKILL.md` を作成
2. `plugins/<name>/.claude-plugin/plugin.json` と `.codex-plugin/plugin.json` を追加
3. `node scripts/sync-marketplaces.mjs` を実行
4. Commit、push

`commands/<name>.md` は追加しません。すでに `skills/<name>/SKILL.md` があるため、Claude Code 側で同名 skill が重複登録されます。

### SKILL.md frontmatter

Claude と Codex の互換性を保つため、本 repo は Agent Skills 標準フィールドのみを使用します。

| Field | Required | Description |
|---|---|---|
| `name` | ✓ | 1–64 文字、小文字英数字とハイフン、directory 名と一致 |
| `description` | ✓ | 最大 1024 文字、具体的な trigger wording を含む |
| `license` | | 例: `MIT` |
| `compatibility` | | Environment requirements、最大 500 文字 |
| `metadata` | | Custom key-value |
| `allowed-tools` | | Pre-approved tools |

Claude 専用の `model`、`effort`、`context: fork` は Codex では無効で、標準 packaging validation を壊す可能性があるため使いません。

## License

MIT
