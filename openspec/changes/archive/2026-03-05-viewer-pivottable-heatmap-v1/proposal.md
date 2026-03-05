## Why

Viewer（Crystalith）场景里，“可回放/可导出”的报表 UI 组件不止表格与基础图表：**透视表（PivotTable）**与**热力图（Heatmap）**是非常常见的分析输出形态。

如果仓库缺少这两类组件，宿主只能：
- 在服务端预先把透视结果渲染成普通 `DataTable/Chart`（丢失语义与复用价值），或
- 在宿主侧各自实现 pivot/heatmap（与 Rivu 的 `sharedState.ui.datasets`、导出链路、tokens/slots 产生重复与分裂）。

本变更把 PivotTable/Heatmap 作为 **Viewer-only、stateless、export-friendly** 的官方组件契约补齐，确保它们能与 datasets、导出与主题化一起作为“可复用 runtime”能力被复用。

## What Changes

- 新增两类 Viewer 组件（均为 stateless，可回放/可导出）：
  - `PivotTable`（`schemaVersion=1`）
  - `Heatmap`（`schemaVersion=1`）
- 为两类组件定义严格的 props schema（`rivu-ui-spec`）并补齐 golden vectors（有效/无效样例）。
- React UI kit 实现与 registry registrations：
  - 支持 `dataRef.datasetId` 引用 `sharedState.ui.datasets`
  - 支持 viewer-safe 降级（缺失 dataset / 编码无效 / 聚合失败时不炸页面）
  - 遵循 `--rivu-*` tokens（可融入宿主设计系统）
- 导出链路增强：HTML 导出可确定性地渲染 PivotTable/Heatmap（不依赖网络）。
- examples/docs 补齐：在 `examples/rivu-react-demo` 中新增分类展示与回归用例，并补充组件契约说明与最佳实践。

## Capabilities

### New Capabilities

- `viewer-pivot-heatmap`: 定义 `PivotTable` 与 `Heatmap` 的 v1 契约（props schema、datasets 引用、viewer-safe 降级、导出确定性要求）。

### Modified Capabilities

- (none)

## Impact

- `packages/rivu-ui-spec`: 新增两类组件 props schema 与 vectors；更新导出入口与 JSON schema 生成。
- `packages/rivu-react`: 新增 `PivotTable/Heatmap` 组件与 registry registrations；对齐 tokens 与降级策略。
- `packages/rivu-react` 导出：HTML 导出支持渲染两类组件（保持离线与确定性）。
- `examples/rivu-react-demo`: 新增 Viewer 分类展示与 fixtures（datasets + mounts）。
- `docs/`: 增加组件说明与集成建议（何时用 PivotTable/Heatmap、如何组织 datasets、如何导出审阅）。
