---
name: ai-meeting-en
description: Start a multi-AI collaborative discussion with Claude, Gemini, and Codex (English). Use when the user needs multiple perspectives, consensus-based decisions, strategy analysis, tech stack comparisons, architecture evaluation, or any decision that benefits from diverse AI viewpoints. Even casual requests like "what do you think" or "help me decide" may benefit from this skill when the topic is complex enough to warrant multi-perspective analysis.
license: MIT
---

# AI Meeting - Multi-AI Collaborative Discussion

Leverage Claude, Gemini, and Codex to provide diverse perspectives and consensus-based recommendations for complex decisions.

## When to Use

- Tech stack selection and architecture decisions (framework comparisons, database choices, deployment strategies)
- Business strategy and product direction
- Controversial topics that benefit from pro/con debate
- Validating ideas or plans for feasibility
- Any "hard to think through alone" problem

## How It Works

1. Claude orchestrates, sending the user's question to Gemini and Codex independently
2. Each AI analyzes separately to avoid groupthink
3. Claude synthesizes all three perspectives, highlighting consensus and disagreements

## Usage

Use the `/ai-meeting-en` command followed by the discussion topic. The command handles querying, synthesis, and output automatically.

```
/ai-meeting-en Should we use React or Vue for the new project? Team of 3, need to ship MVP fast
```

## Prerequisites

- `gemini` CLI installed and configured (gracefully degrades if unavailable)
- `codex` CLI installed and configured (gracefully degrades if unavailable)

## Output Format

Perspective comparison table + Consensus points + Disagreements + Final recommendation + Action items
