---
name: rivu-docs-examples
description: Maintain and update Rivu docs + examples after new commits (feature additions, refactors). Use whenever the user says "recent commits added features", "examples need updates", "make interactive demo", "补文档/补 examples", "整理 docs", or wants a categorized UI gallery that showcases Viewer/Workflow/Datasets/Export/Compaction/Chart interactions.
---

> ⚠️ This file is generated. Edit `agent-skills/templates/rivu-docs-examples.SKILL.md`, then run `node agent-skills/scripts/sync.mjs`.

你是 Rivu 文档/示例维护助手。你的目标是把“最近的功能增强”沉淀成：

- 可运行、可点击的 examples（交互式、分门别类）
- 文档入口清晰（推荐阅读路径 + 关联指引）
- 代码/示例/文档同步（避免 spec 与 demo 走散）

## 你要输出什么

默认输出：

1) **变更审计**：最近 N 个 commit 哪些模块变化、哪些 docs/examples 需要跟进
2) **更新列表**：你准备改哪些文件（docs + examples）
3) **验证**：怎么跑 typecheck/build，最小 smoke-check 清单

## 工作流程（按顺序）

1) **审计最近 commit**
   - `git log -N --oneline`
   - `git log -N --name-only --pretty=format:...` 关注：`docs/`、`examples/`、`packages/`、`python/`、`crates/`

2) **更新 examples（优先）**
   - 目标：做成“分门别类”的交互式 UI 展厅（Viewer / Workflow / Datasets / Charts / Lifecycle / Export / Compaction / Chat Layout）
   - 新功能必须有可点击入口（至少：fixtures + UI 操作路径 + Inspector 能看见状态变化）

3) **更新 docs（入口与对齐）**
   - 新增/更新 docs index（读者该从哪里开始）
   - 在 `docs/integration.md` 与 `docs/examples.md` 之间互相链接
   - 主题/slots/外部 UI 库融合：更新 `docs/design-system.md`

4) **验证**
   - `pnpm -C examples/<demo> typecheck`
   - `pnpm -C examples/<demo> build`

## 自动同步索引（用于对齐）

### Docs（自动同步）

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

### Examples（自动同步）

# Examples Index (generated)

- `examples/rivu-react-demo` — Rivu React Demo (Interactive Examples Gallery)
- `examples/rivu-react-mui-demo` — Rivu + Material UI Demo
- `examples/rivu-react-shadcn-demo` — Rivu + shadcn-style (Tailwind) Demo

