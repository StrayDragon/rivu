## Why

Rivu 当前的 MVP 已能跑通 kernel + registry + `state.ui` 渲染，但“第一次集成”的体验仍偏工程化：文档/示例在事件类型与命名上不够一致（例如 `TEXT_MESSAGE_CONTENT` vs `TEXT_MESSAGE_CHUNK`，以及 `sharedState.ui` vs PRD 里的 `state.ui` 表述），服务端更新 `state.ui` 也需要手写 JSON Patch，缺少一眼能看懂的调试/观测入口。

这会直接降低 Zirvox/Crystalith 迁移与长期维护的直觉性，并增加“看似能跑但细节踩坑”的概率。

## What Changes

- 统一并明确“推荐的集成形状”（DX baseline）：
  - 文档/示例使用一套推荐的文本与工具流式事件（同时保留兼容路径）
  - 统一对 UI state 的命名与路径说明（以 `sharedState.ui` 为准，并在文档中解释与 PRD `state.ui` 的映射）
- 新增一套可选的集成辅助能力（不破坏 headless-first）：
  - TS：提供轻量 adapter helpers（SSE/WS → `{ seq, event }` → kernel），并暴露 gap/resync 的推荐处理钩子形状
  - React/Svelte：提供 `ProtocolInspector`（开发态）用于查看 `seq/needsResync`、最近事件摘要、`sharedState.ui` 片段
  - Python/Rust SDK：提供 `state.ui` 的 JSON Patch 构建 helpers（mount/unmount、set props、replace component、increment revision），减少手写 patch 的错误率
- 修复并补齐规范与示例之间的不一致点，使“照着文档做”能稳定成功。

## Capabilities

### New Capabilities
- `integration-ergonomics`: 定义推荐的集成形状（事件使用、命名约定、resync 处理）以及必备的调试/patch-helper 能力边界。

### Modified Capabilities
- `kernel-runtime`: 明确 gap/resync 的可观测信号与推荐事件别名/兼容策略（以及 `sharedState.ui` 的表述一致性）。
- `ui-v1-event`: 澄清 UI state 在 AG-UI shared state 中的位置与命名（以 `sharedState.ui` 为准）。
- `framework-adapters`: 增补 `ProtocolInspector`（Provider-free 可选糖）与集成辅助导出要求。
- `server-sdk-python`: 增加 `state.ui` JSON Patch helpers 的规范性要求与示例。
- `server-sdk-rust`: 增加 `state.ui` JSON Patch helpers 的规范性要求与示例。
- `react-examples`: demo 需要展示推荐的事件类型与 `ProtocolInspector`，并验证 gap/resync 观测路径。

## Impact

- `packages/rivu-kernel`：导出/文档与示例更新；可能新增少量 adapter helpers（保持可选与 tree-shakable）。
- `packages/rivu-react` / `packages/rivu-svelte`：新增 `ProtocolInspector`（开发态）与相关导出。
- `python/` 与 `crates/`：新增/补齐 `state.ui` patch 构建辅助 API，降低集成复杂度。
- `docs/` 与 `examples/`：统一推荐用法与示例，减少集成歧义。
