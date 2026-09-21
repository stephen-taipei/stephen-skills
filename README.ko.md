# stephen-skills

[English](./README.md) · [繁體中文](./README.zh-TW.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [ไทย](./README.th.md)

Stephen이 자주 사용하는 Agent Skills를 동일한 소스에서 **Claude Code**와 **Codex CLI** 양쪽에 설치할 수 있는 저장소입니다.

Skill은 [Agent Skills](https://agentskills.io) 공개 표준을 따르며 같은 `SKILL.md`를 공유합니다. Repo에는 두 CLI용 marketplace manifest가 모두 포함되어 있어 symlink나 별도 installer가 필요하지 않습니다.

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
| [`review-rust-wasm`](plugins/review-rust-wasm) | JS/TS 프로젝트에서 Rust/WASM으로 옮길 가치가 있는 CPU hotspot을 찾고, 선택 항목을 마이그레이션한 뒤 Web Worker에서 실행하고 전후 차이를 측정해 PDF acceptance report를 생성합니다 |

### review-rust-wasm

6단계 workflow:

1. **후보 스캔**. 정적 pre-filter와 명시적 기준, negative indicators 사용
2. **사용자 선택**
3. **Rust로 이동 후 WASM 빌드**. golden test data와 equivalence test를 먼저 준비
4. **Web Worker 통합**. main thread는 WASM을 직접 로드하지 않고 fallback chain 제공
5. **Benchmark**. end-to-end latency와 main-thread blocking 측정
6. **PDF acceptance report** 생성

원칙:

- **효과는 반드시 측정**
- **성능보다 등가성 우선**
- **fallback 필수**
- **negative indicator에 해당하면 제외**

적합한 후보가 없으면 Rust/WASM 도입 가치가 없다고 명확히 보고합니다.

요구사항: Node.js 18+. Step 3–5는 Rust toolchain과 wasm-pack이 필요하며 Step 6은 Playwright, Puppeteer 또는 system Chrome이 필요합니다.

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

Marketplace manifest는 수동으로 수정하지 않습니다.

```bash
node scripts/sync-marketplaces.mjs
node scripts/sync-marketplaces.mjs --check
```

## Skill 추가

1. `plugins/<name>/skills/<name>/SKILL.md` 생성
2. `plugins/<name>/.claude-plugin/plugin.json`과 `.codex-plugin/plugin.json` 추가
3. `node scripts/sync-marketplaces.mjs` 실행
4. Commit, push

`commands/<name>.md`는 추가하지 않습니다. `skills/<name>/SKILL.md`가 이미 있으므로 Claude Code에서 같은 이름이 중복 등록됩니다.

### SKILL.md frontmatter

Claude와 Codex 양쪽 호환성을 위해 Agent Skills 표준 필드만 사용합니다.

| Field | Required | Description |
|---|---|---|
| `name` | ✓ | 1–64자, 소문자 영숫자와 하이픈, directory 이름과 동일 |
| `description` | ✓ | 최대 1024자, 구체적인 trigger wording 포함 |
| `license` | | 예: `MIT` |
| `compatibility` | | Environment requirements, 최대 500자 |
| `metadata` | | Custom key-value |
| `allowed-tools` | | Pre-approved tools |

Claude 전용 `model`, `effort`, `context: fork` 필드는 Codex에 적용되지 않고 표준 packaging validation을 깨뜨릴 수 있어 사용하지 않습니다.

## License

MIT
