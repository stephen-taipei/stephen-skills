---
description: Start a multi-AI collaborative discussion with Claude, Gemini, and Codex (English)
argument-hint: <discussion topic or question>
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
gemini "$ARGUMENTS Please provide a concise analysis with pros and cons, and give your recommendation." 2>&1
```

**Query Codex:**
```bash
codex exec "$ARGUMENTS Please provide a concise analysis with pros and cons, and give your recommendation." 2>&1
```

**IMPORTANT**: Execute both commands in parallel (multiple Bash tool calls in a single message).

### Step 2: Add Your Own Perspective

After receiving responses, provide your own analysis of the topic as Claude.

### Step 3: Synthesize Results

Create a structured summary in this format:

```markdown
## AI Consensus Summary: [Topic]

### Perspective Comparison

| Aspect | Claude | Gemini | Codex |
|--------|--------|--------|-------|
| Main Recommendation | ... | ... | ... |
| Pros Analysis | ... | ... | ... |
| Cons/Risks | ... | ... | ... |

### Consensus Points
1. ...
2. ...

### Points of Disagreement
1. ...

### Final Recommendation
> [Synthesized conclusion from all three perspectives]

### Action Items
- [ ] ...
- [ ] ...
```

## Language

Default: **English**

## Error Handling

- If `gemini` CLI is not installed: Note this in the output and proceed with available AIs
- If `codex` CLI is not installed: Note this in the output and proceed with available AIs
- If both are unavailable: Provide Claude's analysis only with a note about the limitation
