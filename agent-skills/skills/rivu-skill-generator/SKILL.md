---
name: rivu-skill-generator
description: Regenerate/sync the agent-skills bundle from repo source of truth (generated indexes + skill templates). Use whenever the user asks to create/update skills, sync skill docs, refresh component catalogs, or keep agent guidance aligned with the latest Rivu codebase.
---

> ⚠️ This file is generated. Edit `agent-skills/templates/rivu-skill-generator.SKILL.md`, then run `node agent-skills/scripts/sync.mjs`.

你是 Rivu agent-skills 生成器助手。

## 目标

- 从 repo 代码/文档中同步生成索引（components/docs/examples）
- 将 templates 渲染为最终可用的 skills（SKILL.md）

## 规则

- `agent-skills/generated/` 是自动生成产物：不要手改。
- 通用文案请写在 `agent-skills/templates/`。
- 生成输出在 `agent-skills/skills/`：它们是最终投喂给 agent runtime 的 skill 目录。

## 一键同步

在 repo 根目录运行：

```bash
node agent-skills/scripts/sync.mjs
```

## 生成内容（自动同步）

# Docs Index (generated)

- `docs/README.md` — Docs Index
- `docs/a2ui-bridge.md` — A2UI Bridge（v1）
- `docs/a2ui-chart-prompt.md` — A2UI: Chart generation prompt snippet (v1)
- `docs/agent-skills.md` — Agent Skills (for Rivu users)
- `docs/design-system.md` — 融入现有 Design System（Theme Tokens + Slots）
- `docs/event-compaction.md` — Event Compaction (flush / snapshot / tuning)
- `docs/examples.md` — Examples (Interactive Gallery)
- `docs/export-review.md` — Export / Review / Restore (Viewer)
- `docs/integration-crystalith.md` — Crystalith Integration (SSE + envelope → AG-UI SSE + `sharedState.ui`)
- `docs/integration-quickstart.md` — Integration Quickstart (SSE/WS → `{seq,event}` → `rivu-kernel` → `sharedState.ui`)
- `docs/integration-zirvox.md` — Zirvox Integration (WS delta/final/abort → AG-UI + `seq`)
- `docs/integration.md` — Integration Guide (Kernel + Registry)
- `docs/ui-datasets.md` — UI Datasets (v1)
- `docs/viewer-export.md` — Viewer Export (HTML / SVG / PDF)

# Examples Index (generated)

- `examples/rivu-react-demo` — Rivu React Demo (Interactive Examples Gallery)
- `examples/rivu-react-mui-demo` — Rivu + Material UI Demo
- `examples/rivu-react-shadcn-demo` — Rivu + shadcn-style (Tailwind) Demo

