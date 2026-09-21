# stephen-skills

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [ไทย](./README.th.md)

Repository ของ Agent Skills ที่ Stephen ใช้เป็นประจำ โดยติดตั้งจาก source เดียวกันได้ทั้ง **Claude Code** และ **Codex CLI**

Skill ใช้มาตรฐานเปิด [Agent Skills](https://agentskills.io) และแชร์ `SKILL.md` เดียวกัน Repo มี marketplace manifest สำหรับทั้งสอง CLI จึงไม่ต้องใช้ symlink หรือ installer พิเศษ

## การติดตั้ง

### Claude Code

```
/plugin marketplace add stephen-taipei/stephen-skills
/plugin install review-rust-wasm@stephen-skills
```

### Codex CLI

```bash
codex plugin marketplace add stephen-taipei/stephen-skills
```

## Skill ที่รวมอยู่

| Skill | จุดประสงค์ |
|---|---|
| [`review-rust-wasm`](plugins/review-rust-wasm) | ค้นหา CPU hotspot ในโปรเจกต์ JS/TS ที่เหมาะจะย้ายไป Rust/WASM ย้ายรายการที่เลือกให้รันผ่าน Web Worker วัดผลก่อนและหลัง และสร้าง PDF acceptance report |

### review-rust-wasm

Workflow 6 ขั้นตอน:

1. **สแกน candidate** ด้วย static pre-filter และเกณฑ์ตัดสินที่ชัดเจน รวม negative indicators
2. **ให้ผู้ใช้เลือก** รายการที่จะปรับจริง
3. **ย้ายไป Rust และ build WASM** โดยเตรียม golden test data และ equivalence test ก่อน
4. **รวมกับ Web Worker** โดย main thread ไม่โหลด WASM โดยตรง และมี fallback chain
5. **Benchmark** ทั้ง end-to-end latency และ main-thread blocking
6. **สร้าง PDF acceptance report** ตามภาษาของคำถามเดิม

หลักการที่ไม่ต่อรอง:

- **ผลลัพธ์ต้องวัดจริง**
- **Equivalence มาก่อน performance**
- **ต้องมี fallback**
- **ถ้าเข้า negative indicator ให้ตัดออก**

หากไม่มี candidate ที่เหมาะ Skill จะระบุชัดว่าโปรเจกต์นี้ไม่คุ้มที่จะนำ Rust/WASM มาใช้

ข้อกำหนด: Node.js 18+ ส่วน Step 3–5 ต้องมี Rust toolchain และ wasm-pack และ Step 6 ต้องมี Playwright, Puppeteer หรือ system Chrome

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

อย่าแก้ marketplace manifest ด้วยมือ ใช้คำสั่ง:

```bash
node scripts/sync-marketplaces.mjs
node scripts/sync-marketplaces.mjs --check
```

## การเพิ่ม Skill

1. สร้าง `plugins/<name>/skills/<name>/SKILL.md`
2. เพิ่ม `plugins/<name>/.claude-plugin/plugin.json` และ `.codex-plugin/plugin.json`
3. รัน `node scripts/sync-marketplaces.mjs`
4. Commit และ push

อย่าเพิ่ม `commands/<name>.md` เพราะ `skills/<name>/SKILL.md` มีอยู่แล้ว และ Claude Code จะ register ชื่อซ้ำ

### SKILL.md frontmatter

เพื่อให้ Claude และ Codex ใช้ร่วมกันได้ Repo นี้ใช้เฉพาะ field มาตรฐานของ Agent Skills

| Field | Required | Description |
|---|---|---|
| `name` | ✓ | 1–64 ตัวอักษร ใช้ lowercase alphanumeric และ hyphen และต้องตรงกับชื่อ directory |
| `description` | ✓ | สูงสุด 1024 ตัวอักษร และควรมี trigger wording ที่ชัดเจน |
| `license` | | เช่น `MIT` |
| `compatibility` | | Environment requirements สูงสุด 500 ตัวอักษร |
| `metadata` | | Custom key-value |
| `allowed-tools` | | Pre-approved tools |

Field เฉพาะ Claude เช่น `model`, `effort`, `context: fork` จะไม่ถูกใช้ เพราะ Codex ไม่รองรับ และอาจทำให้ standards-based packaging validation ล้มเหลว

## License

MIT
