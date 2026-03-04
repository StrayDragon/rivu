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

{{GENERATED_DOCS_INDEX}}

{{GENERATED_EXAMPLES_INDEX}}

