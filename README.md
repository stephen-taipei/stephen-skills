# stephen-skills

Stephen 常用的 Agent Skills，同一份來源同時供 **Claude Code** 與 **Codex CLI** 安裝。

Skill 本體遵循 [Agent Skills](https://agentskills.io) 開放標準，兩邊共用同一份 `SKILL.md`；repo 根目錄各放一份對應的 marketplace 目錄檔，兩個 CLI 都能原生安裝，不需要 symlink 或安裝腳本。

---

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

---

## 已收錄的 Skill

| Skill | 用途 |
|-------|------|
| [`review-rust-wasm`](plugins/review-rust-wasm) | 找出 JS/TS 專案中值得搬到 Rust/WASM 的 CPU 熱點，改造選定項目並以 Web Worker 背景執行，量測前後差異，產出 PDF 驗收報告 |

### review-rust-wasm

六步流程，每步完成後回報再往下：

1. **掃描候選** —— 靜態前篩 + 判定準則（含反指標），產出「建議改造」與「已排除」兩張表
2. **用戶選取** —— 多選勾選要動工的項目
3. **移至 Rust 並編譯 WASM** —— 先備黃金測資與等價性測試，全綠才往下
4. **Web Worker 整合** —— 主執行緒不載入 WASM，並實作 fallback 鏈
5. **Benchmark** —— 同時量端到端耗時與主執行緒阻塞
6. **PDF 驗收報告** —— 語言跟隨提問語言

四條不可妥協的原則：

- **效益必須量測** —— 每個數字標明 `實測` 或 `未驗證`，不填沒量過的預估值
- **等價性優先於效能** —— 算得快但算錯的版本沒有價值
- **一定要有 fallback** —— WASM/Worker 不可用時自動退回原 JS
- **反指標命中就排除** —— 不是所有慢的東西都適合 WASM，排除的理由和納入的理由一樣重要

沒有項目通過判定時，skill 會直接說「這個專案不值得引入 Rust/WASM」，而不是硬湊清單。

需求：Node.js 18+；step 3–5 另需 Rust toolchain 與 wasm-pack；step 6 需 Playwright、Puppeteer 或系統 Chrome 其一。

---

## Repo 結構

```
.
├── .claude-plugin/marketplace.json     # Claude Code 目錄檔（自動產生）
├── .agents/plugins/marketplace.json    # Codex CLI 目錄檔（自動產生）
├── plugins/
│   └── <plugin>/
│       ├── .claude-plugin/plugin.json  # 單一真相來源
│       ├── .codex-plugin/plugin.json
│       ├── marketplace.meta.json       # 選填：category、tags
│       ├── commands/                   # slash command（Claude Code）
│       └── skills/<skill>/
│           ├── SKILL.md                # 兩邊共用
│           ├── references/             # 按需載入的細節文件
│           ├── scripts/                # 可執行工具
│           └── assets/                 # 模板等靜態資源
└── scripts/sync-marketplaces.mjs
```

兩份 marketplace 目錄檔**不要手動編輯** —— 由 `plugins/` 自動產生：

```bash
node scripts/sync-marketplaces.mjs            # 重新產生
node scripts/sync-marketplaces.mjs --check    # 只檢查是否同步（CI 用）
```

---

## 新增一個 Skill

1. 建目錄：`plugins/<name>/skills/<name>/SKILL.md`
2. 寫 `plugins/<name>/.claude-plugin/plugin.json` 與 `.codex-plugin/plugin.json`，`name` 必須與目錄名一致
3. 需要 slash command 就加 `plugins/<name>/commands/<name>.md`
4. 執行 `node scripts/sync-marketplaces.mjs`
5. commit、push

### SKILL.md frontmatter

為維持 Claude 與 Codex 雙邊相容，**只使用 Agent Skills 標準欄位**：

| 欄位 | 必填 | 說明 |
|------|------|------|
| `name` | ✓ | 1–64 字元，僅小寫英數與連字號，需與所在目錄同名 |
| `description` | ✓ | 最多 1024 字元。決定 skill 何時被觸發，要寫進具體的觸發語句 |
| `license` | | 例：`MIT` |
| `compatibility` | | 環境需求，最多 500 字元 |
| `metadata` | | 自訂 key-value |
| `allowed-tools` | | 預先核准的工具 |

Claude Code 另有 `model`、`effort`、`context: fork` 等專屬擴充欄位，**本 repo 一律不使用** —— 那些欄位在 Codex 端不生效，且會讓 skill 無法通過標準打包驗證。

---

## 授權

MIT
