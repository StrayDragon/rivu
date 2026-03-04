## Why

在真实的 AI 驱动 UI 场景中，组件往往不是“一次性完整生成”的：LLM/服务端可能先挂载一个占位组件，再逐步补齐 props/state；同时还会遇到 schema 校验失败、patch 失败、组件渲染异常等情况。当前只有 `UnknownComponentCard` 作为兜底，缺少一套统一的“组件生命周期与错误呈现”约定，导致跨组件/跨框架的体验不一致，也不利于调试与回放。

## What Changes

- 为 `sharedState.ui.components[componentId]` 定义统一的生命周期字段（可选，不破坏既有组件）：
  - `status`：`building | ready | error`（以及可选的诊断/错误信息）
  - `error`：结构化错误（code/message/details）用于 viewer-safe 展示
- 在 adapters/UI kit 中标准化渲染策略：
  - `building`：展示 skeleton/占位态（不要求 props 完整）
  - `ready`：按 schema 校验后正常渲染
  - `error`：展示 ErrorCard（可诊断但不泄露敏感信息）
- 在 demo 中提供一条“流式生成组件”的参考链路：先 building 挂载 → 多次 patch props → ready。

## Capabilities

### New Capabilities
- `ui-component-lifecycle`: 定义生命周期字段、错误语义与渲染约定。

### Modified Capabilities
- `ui-v1-event`: 扩展 `sharedState.ui.components[*]` 的可选字段（`status/error`），并约束其回放语义。
- `ui-components-mvp`: 要求 UI kit 提供通用的 skeleton/error 兜底组件，并在未知/错误/构建中状态下可稳定渲染。
- `framework-adapters`: 规范 `ComponentRenderer` 如何根据 `status` 选择渲染分支（skeleton/ready/error/unknown）。
- `react-examples`: demo 增加 lifecycle 场景覆盖与验收用例。

## Impact

- `packages/rivu-react` / `packages/rivu-svelte`: `ComponentRenderer` 与 registry 渲染分支需要支持 `status/error`。
- `packages/rivu-ui-spec`: 需要扩展 UI state schema（可选字段）并补齐 vectors。
- 示例与文档：需要补齐“流式生成 UI”的推荐写法与调试指引。
