---
name: ai-meeting-en
description: Conduct multi-AI collaborative discussions with Claude, Gemini, and Codex. Use this skill when you need consensus or diverse perspectives on complex decisions, strategy planning, or problem-solving.
license: MIT
---

# AI Meeting - Multi-AI Collaborative Discussion

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

Format the user's question in English for consistency. Include:
- Clear context
- Specific constraints or requirements
- Request for pros/cons analysis if applicable

### Step 2: Query All AIs in Parallel

Use Bash tool to query Gemini and Codex simultaneously:

```bash
# Query Gemini
gemini "[Question]. Please provide a concise analysis with pros and cons, and give your recommendation." 2>&1

# Query Codex
codex exec "[Question]. Please provide a concise analysis with pros and cons, and give your recommendation." 2>&1
```

**IMPORTANT**: Always run both queries in parallel using multiple Bash tool calls in a single message.

### Step 3: Synthesize Results

After receiving all responses, create a structured summary:

```markdown
## AI Consensus Summary: [Topic]

### Perspective Comparison

| Aspect | Claude | Gemini | Codex |
|--------|--------|--------|-------|
| [Point 1] | ... | ... | ... |
| [Point 2] | ... | ... | ... |

### Consensus Points
1. ...
2. ...

### Points of Disagreement
1. ...

### Final Recommendation
> [Synthesized conclusion from all three perspectives]
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

**Example 1 - Tech Stack Selection:**
```
/ai-meeting-en React vs Vue for a new project? Team of 3, need to ship MVP fast
```

**Example 2 - Architecture Decision:**
```
/ai-meeting-en Microservices vs Monolith for a mid-size e-commerce platform?
```

**Example 3 - Database Choice:**
```
/ai-meeting-en PostgreSQL or MongoDB for a social platform's data storage?
```

**Example 4 - Development Workflow:**
```
/ai-meeting-en Git Flow vs Trunk-Based Development for a small team?
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

- Default discussion language: **English**
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
