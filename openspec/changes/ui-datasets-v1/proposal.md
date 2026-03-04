## Why

在 Viewer 报表场景中，表格与图表经常复用同一份数据。如果每个组件都把数据内联进 `sharedState.ui.components[*].props`：

- 会产生大量重复字段与重复数据，增加 LLM 生成与传输的 token 成本
- `STATE_DELTA` 的 patch 体积膨胀，写放大更明显
- 导出/审阅时同一份数据可能出现不一致（不同组件的“拷贝”漂移）

因此需要一个可回放、可导出的 **UI 数据集（datasets）抽象**：数据只存一份，组件通过引用使用。

## What Changes

- 在 `sharedState.ui` 下引入 `datasets`（v1）：
  - `sharedState.ui.datasets[datasetId]` 存储结构化数据（默认列式：`columns + rows`）
  - 数据集是 server-owned、可回放、可导出
- 引入组件数据引用方式（v1）：
  - `DataTable` 与 `Chart`（以及未来的报表组件）允许使用 `dataRef` 引用 `datasetId`，避免数据内联
  - 缺失/非法引用必须 viewer-safe 降级（不崩溃）
- 补齐 SDK 与示例：
  - Python/Rust server SDK 提供 datasets 的 patch builder helpers（create/update/delete、引用安全校验）
  - React demo 展示：同一 dataset 同时驱动 DataTable 与 Chart
  - 提供 golden vectors，确保 TS/Python/Rust 对 datasets 形状与引用校验一致

## Capabilities

### New Capabilities
- `ui-datasets`: 定义 `sharedState.ui.datasets` 结构、引用语义、limits 与跨语言一致性向量。

### Modified Capabilities
- `ui-v1-event`: UI shared state 形状扩展（datasets）与引用约束。
- `ui-components-mvp`: MVP 组件对 dataset 引用的支持与降级策略。
- `server-sdk-python`: datasets patch helpers 与校验。
- `server-sdk-rust`: datasets patch helpers 与校验。
- `react-examples`: demo 覆盖 dataset 引用用法（DataTable + Chart 共用）。

## Impact

- `packages/rivu-ui-spec`: 新增 datasets schema（Zod + JSON schema）与 vectors。
- `packages/rivu-kernel`: 可能新增 dataset 选择器/解析辅助（不改变协议语义）。
- `packages/rivu-react` / `packages/rivu-svelte`: 组件解析 `dataRef` 并做降级 UI。
- `python/` 与 `crates/`: 新增 datasets patch builder helpers 与校验工具。
