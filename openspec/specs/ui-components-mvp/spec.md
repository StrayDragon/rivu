# ui-components-mvp Specification

## Purpose
Define requirements for the v1 MVP UI kit components, including viewer-safe stateless components and workflow stateful round-trip components.
## Requirements
### Requirement: Viewer profile ships stateless, replayable components
The UI kit MUST include a Viewer-oriented subset of components that are stateless (no server-authoritative writes) and replayable from `state.ui` snapshots.

At minimum, the kit MUST provide:
- `ReportSection`
- `MetricCard`
- `DataTable`
- `BarChart`
- `LineChart`
- `CitationList`
- `UnknownComponentCard`

#### Scenario: Viewer components render from props only
- **WHEN** a Viewer component is rendered with the same validated props across two sessions
- **THEN** the visual output is stable and does not depend on external services or network requests

### Requirement: Workflow profile ships at least one stateful round-trip component
The UI kit MUST include at least one stateful Workflow component that can complete a full round-trip:
`ui.v1.event` → server validation/authorization/idempotency/concurrency → `STATE_DELTA` → UI update.

The v1 MVP MUST include at least:
- `ApprovalCard` (stateful)
- `FormCard` (stateful)

#### Scenario: ApprovalCard approve round-trip
- **WHEN** a user clicks “approve” on an `ApprovalCard`
- **THEN** the frontend sends `CUSTOM(name="ui.v1.event")` with `eventName="approve"` and the correct `componentId/clientRequestId/baseRevision`

### Requirement: Stateful components are server-authoritative
Stateful components MUST treat `state.ui.components[componentId].state` and `revision` as authoritative.

Stateful components MUST NOT apply local state changes as if they were committed unless a corresponding server envelope is applied.

#### Scenario: Server-only state transition
- **WHEN** a user interacts with a stateful component while offline or the server rejects the request
- **THEN** the component does not falsely show a committed server state

### Requirement: Components validate props and state against schema versions
Each shipped component type MUST define:
- a `schemaVersion`
- a props schema
- for stateful components, a state schema

Renderers MUST validate received props/state before rendering.

#### Scenario: Invalid props degrade gracefully
- **WHEN** a component is mounted with props that do not validate against its schemaVersion
- **THEN** the UI renders `UnknownComponentCard` (or equivalent) instead of crashing

### Requirement: Browser components do not execute tools
Browser-side components MUST NOT execute tools with side effects.

Components MAY emit `ui.v1.event` actions, but tool execution and authorization MUST remain server-side.

#### Scenario: Interaction does not call tool locally
- **WHEN** a user submits a `FormCard`
- **THEN** the frontend only sends `ui.v1.event` and does not perform side-effecting actions locally

### Requirement: MVP 组件必须可主题化且可覆盖
所有 MVP UI 组件 MUST 能通过 Rivu theme tokens（CSS variables）进行主题化，并且 MUST 允许宿主覆盖。

至少：
- 当存在 token 时，组件 MUST 避免硬编码非平凡的颜色调色板
- 组件 MUST 接受 `className` 覆盖
- 复杂组件 SHOULD 暴露 slots/overrides API

#### Scenario: Viewer 组件遵循宿主主题
- **WHEN** 宿主覆盖 foreground/background/border tokens
- **THEN** Viewer 组件使用被覆盖后的 tokens 渲染，而不需要 fork

### Requirement: DataTable 提供 cells 的 render hooks / slot overrides
`DataTable` MUST 提供一种方式让宿主自定义 cell 渲染（例如 formatter 或 cell slot），且不需要修改 server-owned `props`。

#### Scenario: 宿主自定义数值格式化
- **WHEN** 宿主为数值 cells 提供 formatter/render hook
- **THEN** 数值使用宿主 formatter 渲染，同时底层 `sharedState.ui` 快照保持不变

### Requirement: UI kit 提供通用 Skeleton 与 ErrorCard
UI kit MUST 提供通用的 viewer-safe 占位与错误组件，用于统一生命周期渲染：
- `ComponentSkeleton`（或等价）：用于 `status="building"`
- `ComponentErrorCard`（或等价）：用于 `status="error"`

这两者 MUST 不依赖网络请求，并且在相同 props 下渲染稳定可回放。

#### Scenario: Building status shows skeleton
- **WHEN** 一个已注册组件条目 `status="building"`
- **THEN** UI 渲染 skeleton/占位态，而不是直接降级为 Unknown

### Requirement: Viewer components support dataset references
Viewer 组件中，`DataTable` MUST 支持通过 `dataRef` 引用 `sharedState.ui.datasets`（同时允许保留内联数据作为兼容路径）。

当 `dataRef` 存在时，组件 MUST 优先使用引用的数据集（并遵循缺失引用的 viewer-safe 降级策略）。

#### Scenario: DataTable prefers dataRef when present
- **WHEN** `DataTable` 同时提供内联数据与 `dataRef`
- **THEN** 组件优先使用 `dataRef` 解析的数据渲染

