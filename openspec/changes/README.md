# OpenSpec Changes

本目录包含各个变更（change）的 proposal / design / specs / tasks 工件：
- `openspec/specs/*` 是权威 requirements（长期稳定）。
- `openspec/changes/*` 是可执行的变更（规划/设计/任务），准备实现时使用 `/opsx:apply`。
- 已完成的变更会被归档到 `openspec/changes/archive/*`（历史记录）。

## PRD 迁移索引

Legacy PRD（`PRD.md`）退役前后的章节映射与入口索引见：

- `openspec/changes/prd-mapping.md`

## Active changes（待实现 / 进行中）

- `ui-thread-toolkit-v1` — 可选 Thread UI Kit（Layer 2）+ ToolCards primitives（Layer 1.5）。
- `workflow-cards-confirm-task-status-v1` — `ConfirmCard` + `TaskStatusCard`（workflow 常见 P0 交互补齐）。
- `viewer-pivottable-heatmap-v1` — Viewer P1：`PivotTable` + `Heatmap`（datasets + export-friendly）。
- `viewer-diff-view-v1` — Viewer P1：`DiffView`（before/after 差异展示，确定性导出）。
- `workflow-multi-step-wizard-v1` — Workflow P1：`MultiStepWizard`（多步骤、强 revision 语义）+ server SDK processor。
- `workflow-file-upload-card-v1` — Workflow P1：`FileUploadCard`（file refs + out-of-band upload 边界）+ server SDK processor。
- `retire-prd-md` — 文档治理：PRD → OpenSpec 迁移、入口更新与 PRD 移除。

## How to apply

- `/opsx:apply <change-name>`

示例：

- `/opsx:apply ui-render-hooks-slotprops-v1`
