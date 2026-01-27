---
description: 啟動多 AI 協作討論 (繁體中文版) - Start a multi-AI collaborative discussion with Claude, Gemini, and Codex
argument-hint: <討論主題或問題>
allowed-tools: [Bash, Read, Write]
model: sonnet
---

# AI Meeting - Multi-AI Collaborative Discussion

You are facilitating a collaborative discussion between three AI systems (Claude, Gemini, Codex) to provide comprehensive analysis and consensus-based recommendations.

## User's Topic

The user wants to discuss: **$ARGUMENTS**

## Execution Steps

### Step 1: Query All AIs in Parallel

Run both queries simultaneously using the Bash tool:

**Query Gemini:**
```bash
gemini "$ARGUMENTS 請用繁體中文簡潔回答，分析優缺點並給出建議。" 2>&1
```

**Query Codex:**
```bash
codex exec "$ARGUMENTS 請用繁體中文簡潔回答，分析優缺點並給出建議。" 2>&1
```

**IMPORTANT**: Execute both commands in parallel (multiple Bash tool calls in a single message).

### Step 2: Add Your Own Perspective

After receiving responses, provide your own analysis of the topic as Claude.

### Step 3: Synthesize Results

Create a structured summary in this format:

```markdown
## 三方 AI 共識總結：[主題]

### 各方觀點對照

| 觀點 | Claude | Gemini | Codex |
|------|--------|--------|-------|
| 主要建議 | ... | ... | ... |
| 優點分析 | ... | ... | ... |
| 缺點/風險 | ... | ... | ... |

### 共識點 (Consensus)
1. ...
2. ...

### 分歧點 (Disagreements)
1. ...

### 最終建議
> [綜合三方意見的結論]

### 行動建議
- [ ] ...
- [ ] ...
```

## Language

Default: **繁體中文 (Traditional Chinese)**

## Error Handling

- If `gemini` CLI is not installed: Note this in the output and proceed with available AIs
- If `codex` CLI is not installed: Note this in the output and proceed with available AIs
- If both are unavailable: Provide Claude's analysis only with a note about the limitation
