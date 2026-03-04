## Why

Rivu 的核心目标是“像水一样可渗透”：宿主应用可以只采用 Layer 1（`ComponentRenderer` + registry）把富组件嵌入到既有 Chat UI 中。但在实际落地里仍然存在一个常见痛点：**新项目/新页面想快速跑通完整 thread 体验时，需要自己补齐消息列表、tool call/result 展示、状态提示（gap/resync）、以及 mounts 的布局容器**，这部分重复劳动会显著拉高“第一次集成”的门槛。

目前仓库已有 kernel + UI kit 组件 + ProtocolInspector 与多个 demo，但缺少一套明确边界的 **Layer 2：Thread UI Kit（可选，不强绑）**，也缺少通用的 ToolCards（tool call/result 卡片）作为 thread 视图的基础积木。

本变更补齐一套“可选的 thread 外壳组件”，用于新项目快速起步，同时保持 PRD 的核心原则：老项目默认不需要引入、宿主可替换/覆盖、且不引入对宿主路由/鉴权/网络层的耦合。

## What Changes

- 新增 `rivu-react` 的可选 Thread UI Kit（Layer 2）：
  - `ThreadView` / `MessageList` / `MessageBubble` / `ScrollableContainer` / `RunStatus`
  - 组件只依赖 `rivu-kernel` state 与 `rivu-react` registry/renderer primitives，不引入网络请求与外部服务依赖
  - 全部支持 theme tokens（`--rivu-*`）以及最小覆盖入口（`className/style` + 关键 slots/overrides）
- 新增通用 ToolCards primitives（Layer 1.5）：
  - `ToolCallCard`：展示 tool 名称、参数（流式/最终）、状态
  - `ToolResultCard`：展示 tool result（来自 `TOOL_CALL_RESULT` message）并与 toolCall 关联
  - 与 Thread UI Kit 解耦：ToolCards 可被宿主单独使用或替换
- 示例与文档补齐：
  - `examples/rivu-react-demo` 增加一个 thread-kit 展示页（与现有“交互式 gallery”并存），用于验收 mounts + tool cards + resync 状态提示
  - `docs/` 增加“Layer 2 可选采用”的使用指南与覆盖点说明（强调不强绑）

## Capabilities

### New Capabilities

- `thread-ui-kit`: 定义可选 Thread UI Kit 的组件边界、最小 API、覆盖/slots 入口与不强绑约束。
- `tool-cards`: 定义 ToolCall/ToolResult 的渲染 primitives（viewer-safe、可主题化、可替换），以及与 kernel tool state 的映射规则。

### Modified Capabilities

- (none)

## Impact

- `packages/rivu-react`: 新增 thread kit 与 tool cards 组件（React-only），并从包入口导出；与现有 `ComponentRenderer/ProtocolInspector` 共用 tokens 与 registry 机制。
- `examples/rivu-react-demo`: 新增 thread-kit 展示与回归用例（不改变现有 mounts/gallery 的结构约束）。
- `docs/`: 增加 Layer 2 使用说明与覆盖点（如何只用 Layer 1、何时用 Layer 2）。
