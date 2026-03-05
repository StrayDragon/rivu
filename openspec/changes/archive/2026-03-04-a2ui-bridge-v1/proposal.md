## Why

Rivu 目前以 `sharedState.ui`（通过 `STATE_SNAPSHOT/STATE_DELTA`）作为“可回放的 UI 真值”，这对前端渲染与导出很稳，但并不适合让 LLM 直接逐字生成：payload 冗长、重复 key 多、且容易在 patch/挂载语义上出错。

我们需要一套**面向智能体生成**的 A2UI（Agent-to-UI）紧凑描述结构来解决“UI 长什么样”，再由服务端把 A2UI **编译/校验**成 AG-UI 事件流所需的 `sharedState.ui` 更新，从而做到：省 token、稳定回放、可审计、并为后续交互扩展预留空间。

## What Changes

- 引入 A2UI Bridge（v1）：
  - 定义一个 token-efficient 的 `a2ui.v1` payload schema（组件声明、挂载、更新操作），用于 LLM 输出
  - 定义从 `a2ui.v1` 到 `sharedState.ui` 的编译语义：生成/复用 `componentId`、构建 JSON Patch（RFC 6902）以产生 `STATE_DELTA`，并可选择生成 `STATE_SNAPSHOT`
  - 将 A2UI 输入视为不可信：提供 limits（bytes/depth/ops 数量）与 schema 校验，防止恶意/异常 payload
- 在 Python/Rust server SDK 中提供统一的编译器与 patch builder：
  - `compile_a2ui_v1(...) -> { patchOps, createdComponentIds, warnings }`
  - 与现有 resume/snapshot/store 机制协作（不改变 kernel 的 headless-first 约束）
- 提供跨语言 golden vectors：同一组 A2UI 输入在 TS/Python/Rust 上校验一致，并产出等价 patch 结果（或等价语义）。

## Capabilities

### New Capabilities
- `a2ui-bridge`: 定义 `a2ui.v1` payload、编译到 `sharedState.ui` 的规则、以及跨语言一致性向量。

### Modified Capabilities
- `server-sdk-python`: 增加 A2UI v1 decode/validate + compile/patch builder 的规范性要求与最小 API 形状。
- `server-sdk-rust`: 增加 A2UI v1 decode/validate + compile/patch builder 的规范性要求与最小 API 形状。

## Impact

- `packages/rivu-ui-spec`：新增 `a2ui.v1` schema（Zod + JSON schema 输出）与 golden vectors（可被多语言消费）。
- `python/` 与 `crates/`：新增 A2UI 编译器与 patch builder，供宿主后端将 LLM 输出编译为 `STATE_DELTA/STATE_SNAPSHOT`。
- `docs/`：新增 A2UI→AG-UI 的推荐链路说明与最小示例（不要求前端直连 A2UI）。
