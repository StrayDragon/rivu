# framework-adapters Specification

## Purpose
Define requirements for official framework adapters (React and Svelte) that integrate the Rivu kernel and UI registry into applications.
## Requirements
### Requirement: React adapter is optional and Provider-free by default
`rivu-react` MUST allow consumers to use the kernel without a required React Context Provider.

If a Provider is offered, it MUST be optional sugar and MUST NOT be required by core components.

#### Scenario: Use ComponentRenderer without Provider
- **WHEN** a React app creates a kernel instance and passes it directly into a Rivu renderer component
- **THEN** the renderer works without requiring a Provider

### Requirement: React adapter uses external-store subscription semantics
`rivu-react` MUST use React’s external-store subscription mechanism (e.g., `useSyncExternalStore`) to subscribe to kernel state.

#### Scenario: UI re-renders on kernel updates
- **WHEN** a server envelope is applied via `kernel.dispatch(...)`
- **THEN** React components consuming kernel state re-render consistently without tearing

### Requirement: Svelte adapter exposes a readable store
`rivu-svelte` MUST expose a Svelte `readable` store (or equivalent) that reflects kernel state updates.

#### Scenario: Svelte subscribers receive updates
- **WHEN** a Svelte component subscribes to the Rivu store
- **THEN** it receives updates after each applied envelope

### Requirement: Adapters provide a registry and a component renderer primitive
Both adapters MUST provide a registry mechanism mapping `componentType` to renderer implementations.

Adapters MUST provide a `ComponentRenderer` primitive that can:
- lookup `componentId` in `state.ui`
- validate component props/state using registered schemas
- render a known component, or fall back to an `UnknownComponent` renderer

#### Scenario: Unknown component degrades without crashing
- **WHEN** a component type is not registered or schema validation fails
- **THEN** the UI renders an UnknownComponent fallback and the page remains functional

### Requirement: TS packages are ESM-first and tree-shakable
All TypeScript packages produced by Rivu MUST be ESM-first and SHOULD support Vite tree-shaking.

Browser-facing code MUST avoid Node-only APIs.

#### Scenario: Vite can bundle adapters
- **WHEN** a Vite 7 + React 19 project imports `rivu-kernel` and `rivu-react`
- **THEN** the build succeeds without requiring Node polyfills

### Requirement: 适配层提供 ProtocolInspector 调试工具
官方 framework adapters MUST 提供一个仅用于开发态的协议检查器 primitive（例如 `ProtocolInspector`），用于调试 kernel state 与 `sharedState.ui`。

该 inspector MUST 默认 Provider-free：
- React：MUST 可通过显式 props 传入 `kernel`（以及可选 helpers）直接使用
- Svelte：MUST 可通过将 `kernel` 传入 store/primitive 使用，而不要求全局 context

#### Scenario: 不依赖 Provider 使用 ProtocolInspector
- **WHEN** 应用渲染 inspector 并显式传入一个 kernel 实例
- **THEN** inspector 可渲染且不要求全局 Provider 或全局 wiring

### Requirement: ProtocolInspector 暴露 resync 与 UI 摘要信息
inspector MUST 至少展示：
- `lastSeq`
- `needsResync` / `resyncReason`
- gap metadata (expected vs got)
- `sharedState.ui` 的摘要信息（例如组件数量 + 已挂载组件的 id/type 列表）

#### Scenario: Inspector 帮助排查 UI 缺失
- **WHEN** 某个组件因 `sharedState.ui.components` 缺失而无法渲染
- **THEN** inspector 能展示该 componentId 缺失，以及在选定 message/slot 下存在的 mounts

### Requirement: 适配层文档化并支持 theme token 集成
官方 framework adapters MUST 文档化“宿主如何通过覆盖 CSS variables 来主题化 UI kit”。

适配层 MUST NOT 为正确性强制要求导入全局 stylesheet，但 MAY 提供可选的默认 stylesheet 作为便利能力。

#### Scenario: 宿主不导入 CSS 也可主题化
- **WHEN** 宿主应用不导入任何 Rivu 提供的 stylesheet
- **THEN** 组件仍能使用 token 的 fallback 值正确渲染

### Requirement: ComponentRenderer 按 lifecycle status 选择渲染分支
Adapters 的 `ComponentRenderer` MUST 根据 `sharedState.ui.components[componentId]` 的生命周期字段选择渲染分支（优先级从高到低）：
1) unknown：组件未注册或（在 ready 状态下）schema 校验失败 → `UnknownComponent` fallback
2) error：`status="error"` → `ComponentErrorCard`
3) building：`status="building"` → `ComponentSkeleton`
4) ready：`status` 缺失或等于 `"ready"` → 正常渲染

#### Scenario: Renderer respects building status
- **WHEN** 一个组件类型已注册，但其条目 `status="building"`
- **THEN** `ComponentRenderer` 渲染 skeleton 分支，并保持页面可用

### Requirement: Adapters 提供 registry → capabilities 的生成函数
`rivu-react` 与 `rivu-svelte` MUST 提供一个工具函数，用于从当前 registry 生成 `ui.v1.capabilities` payload（`value` 部分）。

该工具函数 MUST：
- 覆盖 registry 中已注册的所有 `componentType`
- 为每个组件填入其支持的 `minSchemaVersion/maxSchemaVersion`
- 默认生成 `features` 字段，并至少包含：
  - `datasets: boolean`
  - `lifecycle: boolean`
  - 当 `Chart` 已注册时，包含 `chart.marks: string[]` 与 `chart.interactions: string[]`（不支持时可为空数组）
- 允许宿主覆盖/扩展 `features`（例如补齐 marks/interactions、或声明导出 formats）

#### Scenario: Capabilities reflects registered components
- **WHEN** registry 注册了 `DataTable`（schemaVersion=1）与 `Chart`（schemaVersion=1）
- **THEN** 生成的 capabilities `components` 包含 `DataTable` 与 `Chart`，且两者的 `minSchemaVersion/maxSchemaVersion` 覆盖 `1`

#### Scenario: Capabilities includes recommended features keys
- **WHEN** registry 中包含 `Chart`，且宿主未提供额外 features 覆盖
- **THEN** 生成的 capabilities `features` 至少包含 `datasets/lifecycle/chart.marks/chart.interactions` 这些 key

### Requirement: Adapters expose an export entrypoint (Provider-free by default)
官方适配层 MUST 提供导出入口（函数或组件层 API），用于将 kernel state / snapshot 导出为 HTML（以及可选 SVG/PDF）。

导出入口 MUST 默认 Provider-free（可通过显式参数传入所需依赖）。

#### Scenario: Export without Provider
- **WHEN** 宿主显式传入导出所需的 snapshot 或 kernel
- **THEN** 适配层可生成 HTML 导出结果而不要求全局 Provider

