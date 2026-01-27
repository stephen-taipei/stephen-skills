---
name: ai-meeting-tw
description: 多 AI 協作討論 (繁體中文版) - Conduct multi-AI collaborative discussions with Claude, Gemini, and Codex. Use this skill when you need consensus or diverse perspectives on complex decisions, strategy planning, or problem-solving.
license: MIT
---

# AI Meeting - 多 AI 協作討論 (繁體中文版)

This skill facilitates collaborative discussions between three AI systems (Claude, Gemini, Codex) to provide comprehensive analysis and consensus-based recommendations.

## When to Use

- Strategic decisions requiring multiple perspectives
- Complex problem-solving that benefits from diverse viewpoints
- Validating ideas or plans with AI consensus
- Research questions needing comprehensive analysis
- Technical architecture decisions
- Business strategy and marketing planning

## How It Works

1. **User provides a question or topic** for discussion
2. **Claude orchestrates** the meeting by:
   - Sending the question to Gemini via `gemini` CLI
   - Sending the question to Codex via `codex exec` CLI
   - Analyzing all three perspectives (including Claude's own)
3. **Output a structured summary** with:
   - Individual AI perspectives
   - Points of consensus
   - Points of disagreement
   - Final recommendation

## Execution Steps

### Step 1: Prepare the Question

Format the user's question in Traditional Chinese (繁體中文) for consistency. Include:
- Clear context
- Specific constraints or requirements
- Request for pros/cons analysis if applicable

### Step 2: Query All AIs in Parallel

Use Bash tool to query Gemini and Codex simultaneously:

```bash
# Query Gemini
gemini "[問題內容]。請用繁體中文簡潔回答，分析優缺點並給出建議。" 2>&1

# Query Codex
codex exec "[問題內容]。請用繁體中文簡潔回答，分析優缺點並給出建議。" 2>&1
```

**IMPORTANT**: Always run both queries in parallel using multiple Bash tool calls in a single message.

### Step 3: Synthesize Results

After receiving all responses, create a structured summary:

```markdown
## 三方 AI 共識總結：[主題]

### 各方觀點對照

| 觀點 | Claude | Gemini | Codex |
|------|--------|--------|-------|
| [觀點1] | ... | ... | ... |
| [觀點2] | ... | ... | ... |

### 共識點 (Consensus)
1. ...
2. ...

### 分歧點 (Disagreements)
1. ...

### 最終建議
> [綜合三方意見的結論]
```

### Step 4: Save Results (Optional)

If user requests, save the discussion to a markdown file:
- Default location: `docs/ai-meeting-[topic]-[date].md`
- Include timestamp and all perspectives

## Output Format

Always structure the final output with:

1. **Header**: Topic and date
2. **Individual Perspectives Table**: Side-by-side comparison
3. **Consensus Section**: Points all AIs agree on
4. **Disagreement Section**: Points of divergence (if any)
5. **Final Recommendation**: Synthesized actionable advice
6. **Action Items**: Concrete next steps (if applicable)

## Example Usage

**範例 1 - 技術選型：**
```
/ai-meeting-tw 新專案應該選 React 還是 Vue？團隊有 3 人，需要快速開發 MVP
```

**範例 2 - 架構決策：**
```
/ai-meeting-tw 微服務 vs 單體架構，中小型電商平台該怎麼選？
```

**範例 3 - 資料庫選擇：**
```
/ai-meeting-tw PostgreSQL 和 MongoDB 哪個更適合社群平台的資料儲存？
```

**範例 4 - 開發流程：**
```
/ai-meeting-tw 小團隊該用 Git Flow 還是 Trunk-Based Development？
```

Claude will:
1. Query Gemini with the question
2. Query Codex with the question
3. Analyze all three perspectives
4. Output structured comparison and recommendation

## CLI Commands Reference

### Gemini
```bash
gemini "[prompt]" 2>&1
```

### Codex
```bash
codex exec "[prompt]" 2>&1
```

**Note**: Both commands require the respective CLI tools to be installed and configured.

## Language

- Default discussion language: **繁體中文 (Traditional Chinese)**
- Can be overridden by user request

## Tips for Best Results

1. **Be specific**: Provide clear context and constraints
2. **Include criteria**: Mention what factors matter most
3. **Request structure**: Ask for pros/cons or specific comparisons
4. **Parallel queries**: Always query Gemini and Codex simultaneously
5. **Save important discussions**: Use the save feature for reference

## Limitations

- Requires `gemini` and `codex` CLI tools to be installed
- Response time depends on all three AI services
- Each AI may have different knowledge cutoff dates
