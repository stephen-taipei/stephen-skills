# stephen-skills

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [ไทย](./README.th.md)

Stephen 常用的 Agent Skills，同一份来源可同时安装到 **Claude Code** 和 **Codex CLI**。

Skill 遵循 [Agent Skills](https://agentskills.io) 开放标准，两边共用同一个 `SKILL.md`。Repo 根目录分别提供 marketplace manifest，因此两个 CLI 都能原生安装，不需要 symlink 或自定义安装脚本。

## 安装

### Claude Code

```
/plugin marketplace add stephen-taipei/stephen-skills
/plugin install review-rust-wasm@stephen-skills
```

### Codex CLI

```bash
codex plugin marketplace add stephen-taipei/stephen-skills
```

## 已收录的 Skill

| Skill | 用途 |
|---|---|
| [`review-rust-wasm`](plugins/review-rust-wasm) | 找出 JS/TS 项目中适合迁移到 Rust/WASM 的 CPU 热点，改造选定项目并通过 Web Worker 后台执行，测量前后差异并生成 PDF 验收报告 |

### review-rust-wasm

六步流程：

1. **扫描候选**，使用静态预筛选和明确判定标准，同时考虑负面指标
2. **用户选择** 要实际改造的项目
3. **迁移到 Rust 并编译 WASM**，先准备黄金测试数据与等价性测试
4. **集成 Web Worker**，主线程不直接加载 WASM，并保留 fallback chain
5. **Benchmark**，同时测量 end-to-end latency 和 main-thread blocking
6. **PDF 验收报告**，语言跟随原始提问

四条不可妥协原则：

- **收益必须测量**
- **等价性优先于性能**
- **必须提供 fallback**
- **命中负面指标就排除**

如果没有项目符合条件，skill 会明确说明该项目不值得引入 Rust/WASM。

要求：Node.js 18+。Step 3–5 还需 Rust toolchain 和 wasm-pack。Step 6 需要 Playwright、Puppeteer 或系统 Chrome。

## Repo 结构

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

不要手动编辑 marketplace manifest。请使用：

```bash
node scripts/sync-marketplaces.mjs
node scripts/sync-marketplaces.mjs --check
```

## 新增 Skill

1. 建立 `plugins/<name>/skills/<name>/SKILL.md`
2. 添加 `plugins/<name>/.claude-plugin/plugin.json` 和 `.codex-plugin/plugin.json`
3. 运行 `node scripts/sync-marketplaces.mjs`
4. Commit、push

不要额外添加 `commands/<name>.md`。Claude Code 会因为 `skills/<name>/SKILL.md` 已存在而重复注册同名 skill。

### SKILL.md frontmatter

为了同时兼容 Claude 和 Codex，本 repo 只使用 Agent Skills 标准字段。

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✓ | 1–64 字符，小写字母数字和连字符，需与目录同名 |
| `description` | ✓ | 最多 1024 字符，需包含具体触发语句 |
| `license` | | 例：`MIT` |
| `compatibility` | | 环境要求，最多 500 字符 |
| `metadata` | | 自定义 key-value |
| `allowed-tools` | | 预先批准的工具 |

Claude 专属字段如 `model`、`effort`、`context: fork` 不在本 repo 中使用，因为 Codex 不适用，并且可能导致标准化打包验证失败。

## 许可

MIT
