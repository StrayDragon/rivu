# PRD → OpenSpec mapping (legacy index)

本文件用于把已退役的 `PRD.md`（2026-03-04）章节映射到 OpenSpec 的权威工件：
- requirements：`openspec/specs/*`
- executable work：`openspec/changes/*`（proposal/design/specs/tasks）

目标是让读者在没有 PRD 的情况下，仍能快速定位“以前 PRD 里写的内容现在在哪里”。

## Section mapping

### 0. Meta（命名与路径约定）

- 治理与权威入口：`openspec/changes/retire-prd-md`、`openspec/changes/retire-prd-md/specs/spec-governance/spec.md`

### 1. 背景与问题（Why now）/ 2. Goals & Non-goals / 5. User stories / 12. DoD

- 项目入口与集成哲学（adoption ladder / “像水一样”）：`docs/integration.md`
- 集成 quickstart（SSE/WS envelopes + resume + mounts）：`docs/integration-quickstart.md`
- DX 一致性（默认 chunk 事件、ProtocolInspector 等）：`openspec/specs/integration-ergonomics/spec.md`

### 3. 参考与依赖（AG-UI SDK）

- wire format 与 state 形状约束：`openspec/specs/seq-resume/spec.md`、`openspec/specs/kernel-runtime/spec.md`、`openspec/specs/ui-v1-event/spec.md`

### 4. 产品形态（packages / profiles / layers）

- kernel/runtime：`openspec/specs/kernel-runtime/spec.md`
- adapters（React/Svelte）：`openspec/specs/framework-adapters/spec.md`
- UI MVP 组件集合（Viewer/Workflow）：`openspec/specs/ui-components-mvp/spec.md`
- 主题化与覆盖：`openspec/specs/ui-theme-tokens-slots/spec.md`
- 生命周期（building/ready/error）：`openspec/specs/ui-component-lifecycle/spec.md`
- Thread 外壳（可选 Layer 2）：`openspec/changes/ui-thread-toolkit-v1`
- render hooks + slotProps（数据级扩展点）：`openspec/changes/ui-render-hooks-slotprops-v1`

### 6. 协议与状态模型（`seq + resumeFrom` / `sharedState.ui` / `ui.v1.event` / revision）

- `seq + resumeFrom`：`openspec/specs/seq-resume/spec.md`
- kernel gap/resync 语义与 outbox：`openspec/specs/kernel-runtime/spec.md`
- UI state shape（`sharedState.ui`）与 `ui.v1.event`：`openspec/specs/ui-v1-event/spec.md`
- capabilities handshake（选择/降级）：`openspec/specs/ui-v1-capabilities/spec.md`
- outbox failed retry：`openspec/changes/kernel-outbox-retry-v1`

### 7. 事件存储与快照 / 10. Server SDK（Python/Rust）

- event store + snapshot + replay/resume：`openspec/specs/event-store-snapshot/spec.md`
- Python SDK：`openspec/specs/server-sdk-python/spec.md`
- Rust SDK：`openspec/specs/server-sdk-rust/spec.md`
- compaction/flush：`openspec/specs/event-compaction/spec.md`

### 8. 多端一致性（并发冲突语义）

- optimistic concurrency（`baseRevision`/`revision`）：`openspec/specs/ui-v1-event/spec.md`

### 9. 工具执行与权限（安全边界）

- limits/policy（decode + uiState + jsonPatch）：`openspec/specs/security-limits-policy/spec.md`
- 交互必须后端权威：`openspec/specs/ui-components-mvp/spec.md`

### 11. 集成到 Zirvox / Crystalith

- Zirvox 迁移指南：`docs/integration-zirvox.md`
- Crystalith 迁移指南：`docs/integration-crystalith.md`

### Viewer profile（回顾/导出/报表）

- datasets：`openspec/specs/ui-datasets/spec.md`
- Chart（Viewer stateless）：`openspec/specs/a2ui-viz-chart/spec.md`
- Chart 交互（Workflow selection）：`openspec/specs/chart-interactions/spec.md`
- 导出格式：`openspec/specs/viewer-export-formats/spec.md`
- Viewer P1（透视/热力/差异）：`openspec/changes/viewer-pivottable-heatmap-v1`、`openspec/changes/viewer-diff-view-v1`

### Workflow profile（审批/表单/级联）

- MVP：`openspec/specs/ui-components-mvp/spec.md`
- ConfirmCard/TaskStatusCard：`openspec/changes/workflow-cards-confirm-task-status-v1`
- MultiStepWizard：`openspec/changes/workflow-multi-step-wizard-v1`
- FileUploadCard：`openspec/changes/workflow-file-upload-card-v1`

### 13. PRD 的开放问题（已落入 OpenSpec 的可执行变更）

- 首批 workflow 组件扩展（Confirm/TaskStatus/Wizard/FileUpload）：对应 `openspec/changes/workflow-*`
- tokens/slots/render hooks：`openspec/changes/ui-render-hooks-slotprops-v1`
- outbox retry：`openspec/changes/kernel-outbox-retry-v1`
