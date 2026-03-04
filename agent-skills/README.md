# Agent Skills (Rivu)

This folder ships **agent-friendly skills** for working with the Rivu repo as a user/integrator:

- integrating the kernel + registry into an existing app
- building server-authoritative workflow loops (`ui.v1.event` → `STATE_DELTA`)
- keeping docs/examples in sync after feature work
- (optional) regenerating these skills from the repo source of truth

## Directory layout

- `agent-skills/templates/` — **edit here** (human-written, reusable copy)
- `agent-skills/generated/` — **do not edit** (synced from repo source files)
- `agent-skills/skills/` — **generated output** (final skills to install/use)
- `agent-skills/scripts/` — generator/sync scripts
- `agent-skills/evals/` — sample prompts for quick smoke tests

## Sync / generate

From repo root:

```bash
node agent-skills/scripts/sync.mjs
```

This updates:

- `agent-skills/generated/*.generated.md`
- `agent-skills/skills/*/SKILL.md` (rendered from templates + generated blocks)

## Skills included

- `agent-skills/skills/rivu-integration/SKILL.md` — integrate Rivu (SSE/WS, kernel, mounts, registry, capabilities)
- `agent-skills/skills/rivu-docs-examples/SKILL.md` — update docs/examples after new commits
- `agent-skills/skills/rivu-a2ui-bridge/SKILL.md` — implement/debug A2UI (`a2ui.v1` → safe `/ui/...` patches)
- `agent-skills/skills/rivu-skill-generator/SKILL.md` — regenerate these skills (templates + sync blocks)

## “Multiple skills dirs” (where to put them)

This repo already has:

- `.codex/skills/` — local Codex skills (repo-internal workflow)
- `agent-skills/skills/` — distributable Rivu-user skills (this folder)

If your agent runtime only scans one skills root, you can copy any generated skill folder from:

- `agent-skills/skills/<skill-name>/`

into:

- your runtime’s skills directory (for this repo: `.codex/skills/`)

## Example prompts (as a Rivu user)

1) **Integrate into my app**

> “我有一个现有的 React 应用（SSE），想把 Rivu 的 viewer/workflow 组件嵌进去。请给我最小集成方案：seq/resumeFrom、registry、mounts、capabilities handshake、以及服务端 ui.v1.event 的处理闭环。”

2) **Update docs/examples after changes**

> “最近新增了 chart interactions + event compaction。请把 examples 做成分门别类的交互式展厅，并把 docs 补全索引和对应章节入口，最后跑一遍 typecheck/build。”

3) **A2UI bridge**

> “我想让 LLM 输出 a2ui.v1，然后服务端把它编译成 JSON Patch 只改 /ui/... 并发 STATE_DELTA。请按 Python 实现一个最小闭环，并说明 limits + key map store 怎么做。”

