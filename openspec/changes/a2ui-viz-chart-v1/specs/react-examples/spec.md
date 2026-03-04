## MODIFIED Requirements

### Requirement: Demo renders all v1 MVP components
仓库 MUST 在 `examples/` 下包含一个可运行的 React demo，并通过 workspace 依赖引用 `rivu-kernel` 与 `rivu-react`。

demo MUST 从官方 registry 中渲染所有 v1 MVP 组件类型。

#### Scenario: Viewer components visible
- **WHEN** demo 加载初始 `STATE_SNAPSHOT`
- **THEN** 会渲染 `ReportSection`, `MetricCard`, `DataTable`, `Chart`, `BarChart`, `LineChart`, `CitationList`

#### Scenario: Workflow components visible
- **WHEN** demo 加载初始 `STATE_SNAPSHOT`
- **THEN** 会渲染 `ApprovalCard` 与 `FormCard`
