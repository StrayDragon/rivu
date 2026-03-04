## Why

Viewer（报表/回顾/审阅）场景里，“本次 vs 上次”、“现状 vs 目标”、“建议改动”是高频表达。仅靠 `DataTable/MetricCard/Chart` 很难自然呈现**差异语义**，宿主往往会各自实现 diff 组件，导致：
- 视觉/主题化不一致（难以融入宿主设计系统）
- 导出链路缺失（HTML/PDF 审阅无法复用同一渲染）
- 安全与 limits 分散（大文本 diff 容易炸 UI / 写放大）

本变更新增一个 Viewer-only 的 `DiffView` 组件：从快照确定性渲染一段“before/after 差异”，适用于报告审阅、变更说明与对比展示。

## What Changes

- 新增 Viewer 组件：
  - `DiffView`（`schemaVersion=1`，stateless）
  - 支持 `unified` 与 `split` 两种展示模式（v1 最小集合）
  - 默认以**按行 diff**呈现（确定性 + export-friendly），不执行网络请求
- 为 `DiffView@1` 定义严格 props schema（`rivu-ui-spec`）并补齐 golden vectors。
- React UI kit 实现与 registry registration（遵循 `--rivu-*` tokens，支持 `className/style` 覆盖）。
- 导出链路支持：HTML 导出能稳定渲染 `DiffView`（未知/过大输入降级为 viewer-safe 占位）。
- examples/docs 补齐：在 `examples/rivu-react-demo` 的 Viewer 分类中新增 DiffView 展示与回归用例。

## Capabilities

### New Capabilities

- `viewer-diff-view`: 定义 `DiffView@1` 的契约（props schema、确定性渲染、降级策略与导出要求）。

### Modified Capabilities

- (none)

## Impact

- `packages/rivu-ui-spec`: 新增 `DiffView@1` props schema + vectors；更新 JSON schema 生成。
- `packages/rivu-react`: 新增 `DiffView` 组件与 registry registration；遵循 tokens 与 viewer-safe 降级。
- `packages/rivu-react` 导出：HTML 导出支持 `DiffView`。
- `examples/rivu-react-demo`: 新增 DiffView 分类展示与 fixtures。
- `docs/`: 增加 DiffView 使用指南（何时用 diff、如何控制 payload/limits、如何导出审阅）。
