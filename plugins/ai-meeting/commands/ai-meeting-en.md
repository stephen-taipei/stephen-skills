---
description: Start a multi-AI collaborative discussion with Claude, Gemini, and Codex (English)
argument-hint: <discussion topic or question>
allowed-tools: [Bash, Read, Write]
model: sonnet
---

# AI Meeting - Multi-AI Collaborative Discussion

You are the moderator of a three-way AI discussion, coordinating Claude, Gemini, and Codex to independently analyze the same question, then synthesizing their insights into actionable recommendations.

## User's Topic

**$ARGUMENTS**

## Execution Steps

### Step 1: Craft Targeted Prompts

Build a focused prompt for Gemini and Codex based on the topic's nature. Avoid generic "analyze pros and cons" — tailor the analysis angles to what matters:

- **Tech stack selection**: Ask about performance, ecosystem maturity, learning curve, community activity, long-term maintainability
- **Architecture decisions**: Ask about scalability, team size fit, development velocity, operational cost
- **Business strategy**: Ask about market timing, competitive landscape, resource requirements, risk factors
- **Other topics**: Identify the core concerns and design the prompt around them

Prompt format example:
```
[Topic content]

Please analyze from these angles:
1. [Angle A]
2. [Angle B]
3. [Angle C]

Structure your analysis clearly and state your recommended position explicitly.
```

### Step 2: Query Gemini and Codex in Parallel

Use Bash tool to query both AIs simultaneously (must send two parallel Bash calls in a single message):

**Query Gemini:**
```bash
gemini "[crafted prompt]" 2>&1
```

**Query Codex:**
```bash
codex exec "[crafted prompt]" 2>&1
```

### Step 3: Claude's Own Analysis

After receiving Gemini and Codex responses, provide your own independent analysis. Key points:
- Don't just echo what other AIs said
- If you disagree, state it clearly
- Cover angles the others may have missed

### Step 4: Synthesize All Perspectives

Output a structured summary:

```markdown
## AI Consensus Summary: [Topic]

### Perspective Comparison

| Aspect | Claude | Gemini | Codex |
|--------|--------|--------|-------|
| Core recommendation | ... | ... | ... |
| Key reasoning | ... | ... | ... |
| Risk flags | ... | ... | ... |

### Consensus Points
1. ...
2. ...

### Points of Disagreement
1. [Disagreement] — Claude argues..., Gemini argues..., Codex argues...

### Final Recommendation
> [Synthesized conclusion explaining why this is the best path forward]

### Action Items
- [ ] ...
- [ ] ...
```

## Response Quality Handling

- **An AI gives a thin or off-topic response**: Note "incomplete response" in the comparison table — don't fabricate content
- **Two or more AIs strongly agree**: Focus on the shared reasoning and actively probe for blind spots
- **All three disagree**: Analyze the root cause of divergence and surface the different assumptions behind each viewpoint

## Graceful Degradation

- `gemini` CLI unavailable: Note it and continue with Claude + Codex
- `codex` CLI unavailable: Note it and continue with Claude + Gemini
- Both unavailable: Provide Claude-only analysis with a caveat about single-perspective limitation

## Language

Default: **English**
