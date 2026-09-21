# stephen-skills

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [ไทย](./README.th.md)

Stephen 常用的 Agent Skills，同一份來源同時供 **Claude Code** 與 **Codex CLI** 安裝。

Skill 本體遵循 [Agent Skills](https://agentskills.io) 開放標準，兩邊共用同一份 `SKILL.md`。Repo 根目錄各放一份對應 marketplace 目錄檔，兩個 CLI 都能原生安裝，不需要 symlink 或自訂安裝腳本。

## 安裝

### Claude Code

```
/plugin marketplace add stephen-taipei/stephen-skills
/plugin install review-rust-wasm@stephen-skills
```

### Codex CLI

```bash
codex plugin marketplace add stephen-taipei/stephen-skills
```

## 已收錄的 Skill

| Skill | 用途 |
|---|---|
| [`review-rust-wasm`](plugins/review-rust-wasm) | 找出 JS/TS 專案中值得搬到 Rust/WASM 的 CPU 熱點，改造選定項目並以 Web Worker 背景執行，量測前後差異，產出 PDF 驗收報告 |

### review-rust-wasm

六步流程：

1. **掃描候選**，以靜態前篩與明確判定準則找出候選，也納入反指標
2. **用戶選取** 要實際改造的項目
3. **移至 Rust 並編譯 WASM**，先建立黃金測資與等價性測試
4. **Web Worker 整合**，主執行緒不直接載入 WASM，並保留 fallback chain
5. **Benchmark**，同時量測 end-to-end latency 與 main-thread blocking
6. **PDF 驗收報告**，語言跟隨原始提問

四條不可妥協原則：

- **效益必須量測**，每個數字標記為實測或未驗證
- **等價性優先於效能**
- **一定要有 fallback**
- **反指標命中就排除**

若沒有項目符合條件，skill 會明確回報該專案不值得導入 Rust/WASM。

需求：Node.js 18+。Step 3–5 另需 Rust toolchain 與 wasm-pack。Step 6 需 Playwright、Puppeteer 或系統 Chrome。

## Repo 結構

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

兩份 marketplace 目錄檔不要手動編輯。請使用：

```bash
node scripts/sync-marketplaces.mjs
node scripts/sync-marketplaces.mjs --check
```

## 新增一個 Skill

1. 建立 `plugins/<name>/skills/<name>/SKILL.md`
2. 加入 `plugins/<name>/.claude-plugin/plugin.json` 與 `.codex-plugin/plugin.json`
3. 執行 `node scripts/sync-marketplaces.mjs`
4. Commit、push

不要另外新增 `commands/<name>.md`。Claude Code 會因為 `skills/<name>/SKILL.md` 已存在而重複註冊同名 skill。

### SKILL.md frontmatter

為保持 Claude 與 Codex 相容，本 repo 僅使用 Agent Skills 標準欄位：

| 欄位 | 必填 | 說明 |
|---|---|---|
| `name` | ✓ | 1–64 字元，小寫英數與連字號，需與目錄同名 |
| `description` | ✓ | 最多 1024 字元，需包含具體觸發語句 |
| `license` | | 例：`MIT` |
| `compatibility` | | 環境需求，最多 500 字元 |
| `metadata` | | 自訂 key-value |
| `allowed-tools` | | 預先核准工具 |

Claude 專屬的 `model`、`effort`、`context: fork` 等欄位刻意不使用，因為 Codex 不適用，且可能讓標準化封裝驗證失敗。

## 授權

MIT
