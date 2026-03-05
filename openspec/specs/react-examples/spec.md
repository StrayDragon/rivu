# react-examples Specification

## Purpose
TBD - created by archiving change rivu-react-examples. Update Purpose after archive.
## Requirements
### Requirement: React demo project exists
The repository MUST include a runnable React demo under `examples/` that depends on `rivu-kernel` and `rivu-react` via workspace dependencies.

#### Scenario: Install and start dev server
- **WHEN** the user runs `pnpm -C examples/rivu-react-demo dev`
- **THEN** a Vite dev server starts successfully without requiring external services

### Requirement: Demo renders all v1 MVP components
The demo MUST render all v1 MVP component types from the official registries.

#### Scenario: Viewer components visible
- **WHEN** the demo loads the initial `STATE_SNAPSHOT`
- **THEN** `ReportSection`, `MetricCard`, `DataTable`, `BarChart`, `LineChart`, and `CitationList` are rendered

#### Scenario: Workflow components visible
- **WHEN** the demo loads the initial `STATE_SNAPSHOT`
- **THEN** `ApprovalCard` and `FormCard` are rendered

### Requirement: Demo demonstrates mounts embedding
The demo MUST demonstrate `state.ui.components[componentId].mounts` embedding using PRD slots `inline | sidebar`.

#### Scenario: Inline mounts render under messages
- **WHEN** a component is mounted with `{ slot: "inline" }` for a message
- **THEN** the component is rendered in the message content area

#### Scenario: Sidebar mounts render in sidebar
- **WHEN** a component is mounted with `{ slot: "sidebar" }` for a message
- **THEN** the component is rendered in a sidebar area

### Requirement: Workflow round-trip uses server-authoritative state
Workflow components MUST only update their persisted state after receiving server-produced AG-UI events.

#### Scenario: ApprovalCard approve updates revision via server delta
- **WHEN** the user clicks Approve on an `ApprovalCard`
- **THEN** the client sends `CUSTOM(name="ui.v1.event")` with `baseRevision`
- **AND THEN** the demo server responds with a `STATE_DELTA` that updates the component `state` and increments `revision`

#### Scenario: FormCard setField and submit update via server delta
- **WHEN** the user edits a field or submits a `FormCard`
- **THEN** the client sends `CUSTOM(name="ui.v1.event")` with `baseRevision`
- **AND THEN** the demo server responds with a `STATE_DELTA` that updates the component `state` and increments `revision`

### Requirement: No Provider required
The demo MUST render components without requiring a global Provider.

#### Scenario: ComponentRenderer receives kernel and registry explicitly
- **WHEN** the demo renders a component
- **THEN** it passes `kernel` and `registry` directly to `ComponentRenderer`

### Requirement: Demo 演示推荐的 chunk 风格流式事件
React demo MUST 演示推荐的默认流式事件写法：
- `TEXT_MESSAGE_CHUNK` for streamed text deltas
- `TOOL_CALL_CHUNK` for streamed tool-call argument deltas

#### Scenario: Demo 使用 chunk 事件流式输出消息
- **WHEN** demo 以流式方式输出 assistant message content
- **THEN** 在结束 `TEXT_MESSAGE_END` 之前，它使用 `TEXT_MESSAGE_CHUNK` 事件（而不只是 `TEXT_MESSAGE_CONTENT`）

### Requirement: Demo 包含 ProtocolInspector 用于调试
React demo MUST 包含一个 `ProtocolInspector` 视图（或等价物），用于展示：
- `lastSeq`
- `needsResync` / `resyncReason`
- gap metadata and a `sharedState.ui` summary

#### Scenario: Demo 暴露 lastSeq 与 needsResync
- **WHEN** demo 运行时
- **THEN** 开发者可以打开 inspector 并观察 kernel state 的 `lastSeq` 与 resync 相关字段

### Requirement: Demo 演示 theme token 覆盖
React demo MUST 包含一个示例，展示宿主应用可以覆盖 Rivu theme tokens（包括图表 palette tokens）。

#### Scenario: Demo 展示自定义 palette
- **WHEN** demo 应用一组自定义 token 覆盖
- **THEN** 至少一个 UI kit 组件（以及在存在图表时至少一个 chart）使用自定义 tokens 渲染

### Requirement: Demo 演示复杂组件的 slots/overrides
React demo MUST 包含一个示例，展示对复杂组件进行 slots/overrides 定制（例如 DataTable empty state 或 cell renderer）。

#### Scenario: Demo 替换 DataTable empty state
- **WHEN** demo 为 `DataTable` 提供一个自定义 empty state slot
- **THEN** 当数据为空时展示该自定义 renderer

