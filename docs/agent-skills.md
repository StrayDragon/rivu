# Agent Skills (for Rivu users)

This repo includes an `agent-skills/` bundle intended for people integrating or maintaining Rivu with an LLM agent (Codex/Claude/etc.).

It provides:

- reusable integration guidance (kernel + registry + mounts + workflow loop)
- docs/examples maintenance workflows
- A2UI bridge implementation guidance
- a small generator to keep skill references synced with the codebase

## Where it lives

- `agent-skills/README.md` — overview + usage + example prompts
- `agent-skills/skills/*/SKILL.md` — generated skills
- `agent-skills/templates/` — edit these templates
- `agent-skills/generated/` — generated reference blocks (synced from repo)

## Sync

From repo root:

```bash
node agent-skills/scripts/sync.mjs
```

