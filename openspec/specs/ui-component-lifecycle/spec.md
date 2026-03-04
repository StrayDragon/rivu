# ui-component-lifecycle Specification

## Purpose
Define replayable UI component lifecycle fields (`status`, `error`) under `sharedState.ui.components[*]` to support streaming build→ready transitions, stable skeleton/error rendering, and safe fallbacks.
## Requirements
### Requirement: 组件条目支持 `status` 生命周期字段
系统 MUST 支持在 `sharedState.ui.components[componentId]` 中携带可选生命周期字段 `status`，用于表达组件当前渲染阶段。

`status` 的取值 MUST 为以下之一：
- `"building"`：组件正在生成/补齐中
- `"ready"`：组件 props/state 已就绪，可按 schema 严格校验并渲染
- `"error"`：组件生成/处理失败，应展示错误态

当 `status` 缺失时，consumer MUST 将其视为 `"ready"`（向后兼容）。

#### Scenario: Missing status defaults to ready
- **WHEN** 一个组件条目没有 `status` 字段
- **THEN** renderer 将其视为 `status="ready"` 并按 ready 规则渲染

### Requirement: `error` 字段为 viewer-safe 的结构化错误
`error` 字段（如存在）MUST 为 viewer-safe 的结构化错误对象。

当 `status="error"` 时，组件条目 MAY 包含 `error` 字段，且：
- `error.code`: non-empty string
- `error.message`: non-empty string
- `error.details`: JSON object（可选，MAY 省略；生产环境 SHOULD 避免敏感信息）

当 `status != "error"` 时，`error` 字段 SHOULD 不出现；若出现，renderer MUST 忽略或以安全方式处理，不得崩溃。

#### Scenario: Error status renders without crashing
- **WHEN** 一个组件条目 `status="error"` 且包含合法的 `error`
- **THEN** UI 使用 ErrorCard（或等价组件）展示错误信息，并保持页面可用
