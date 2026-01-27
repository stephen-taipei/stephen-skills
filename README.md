# Stephen's Claude Code Skills

A collection of custom plugins and skills for [Claude Code](https://claude.ai/claude-code).

## Available Plugins

| Plugin                           | Description                                                                      | Version |
| -------------------------------- | -------------------------------------------------------------------------------- | ------- |
| [ai-meeting](plugins/ai-meeting) | Multi-AI collaborative discussions with Claude, Gemini, and Codex (繁中/English) | 1.1.0   |

## Installation

### Quick Install (Single Plugin)

```bash
# 1. Add this marketplace to your Claude Code config
# Edit ~/.claude/plugins/known_marketplaces.json and add:

{
  "stephen-skills": {
    "source": {
      "source": "github",
      "repo": "stephen-taipei/stephen-skills"
    },
    "installLocation": "~/.claude/plugins/marketplaces/stephen-skills",
    "lastUpdated": "2026-01-26T00:00:00.000Z"
  }
}

# 2. Install a plugin via Claude Code
claude plugins install ai-meeting@stephen-skills
```

### Manual Install

1. Clone this repository:

```bash
git clone https://github.com/stephen-taipei/stephen-skills.git ~/.claude/plugins/marketplaces/stephen-skills
```

2. Register the marketplace in `~/.claude/plugins/known_marketplaces.json`:

```json
{
  "stephen-skills": {
    "source": {
      "source": "github",
      "repo": "stephen-taipei/stephen-skills"
    },
    "installLocation": "~/.claude/plugins/marketplaces/stephen-skills"
  }
}
```

3. Add to `~/.claude/plugins/installed_plugins.json`:

```json
{
  "plugins": {
    "ai-meeting@stephen-skills": [
      {
        "scope": "user",
        "installPath": "~/.claude/plugins/marketplaces/stephen-skills/plugins/ai-meeting",
        "version": "1.1.0"
      }
    ]
  }
}
```

4. Enable in `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "ai-meeting@stephen-skills": true
  }
}
```

5. Restart Claude Code.

## Plugin: ai-meeting

Multi-AI collaborative discussions for consensus-based decision making.

### Features

- Get perspectives from Claude, Gemini, and Codex simultaneously
- Structured comparison tables
- Consensus and disagreement analysis
- Actionable recommendations
- Bilingual support: Traditional Chinese (繁體中文) and English

### Usage

| Command | Language | Description |
| ------- | -------- | ----------- |
| `/ai-meeting-tw` | 繁體中文 | 啟動多 AI 協作討論 |
| `/ai-meeting-en` | English | Start multi-AI collaborative discussion |

### Examples

**繁體中文 (`/ai-meeting-tw`):**

```
/ai-meeting-tw 新專案應該選 React 還是 Vue？團隊有 3 人，需要快速開發 MVP
/ai-meeting-tw 微服務 vs 單體架構，中小型電商平台該怎麼選？
/ai-meeting-tw PostgreSQL 和 MongoDB 哪個更適合社群平台的資料儲存？
/ai-meeting-tw 小團隊該用 Git Flow 還是 Trunk-Based Development？
```

**English (`/ai-meeting-en`):**

```
/ai-meeting-en React vs Vue for a new project? Team of 3, need to ship MVP fast
/ai-meeting-en Microservices vs Monolith for a mid-size e-commerce platform?
/ai-meeting-en PostgreSQL or MongoDB for a social platform's data storage?
/ai-meeting-en Git Flow vs Trunk-Based Development for a small team?
```

### Prerequisites

For full multi-AI functionality:

- **Gemini CLI**: `gemini` command ([Installation Guide](https://ai.google.dev/gemini-api/docs/quickstart))
- **Codex CLI**: `codex` command ([OpenAI CLI](https://platform.openai.com/docs/guides/command-line))

The plugin works with Claude alone if these are not installed.

## Directory Structure

```
stephen-skills/
├── README.md                           # This file
└── plugins/
    └── ai-meeting/
        ├── .claude-plugin/
        │   └── plugin.json             # Plugin metadata
        ├── commands/
        │   ├── ai-meeting-tw.md        # /ai-meeting-tw 繁體中文指令
        │   └── ai-meeting-en.md        # /ai-meeting-en English command
        └── skills/
            ├── ai-meeting-tw/
            │   └── SKILL.md            # 繁體中文自然語言觸發
            └── ai-meeting-en/
                └── SKILL.md            # English natural language trigger
```

## Creating Your Own Plugin

1. Create a new folder under `plugins/`
2. Add `.claude-plugin/plugin.json` with metadata
3. Add commands in `commands/` (for slash commands)
4. Add skills in `skills/` (for natural language triggers)
5. See [Claude Code Plugin Documentation](https://docs.anthropic.com/claude-code/plugins) for details

## License

MIT

## Author

Stephen Chuang
