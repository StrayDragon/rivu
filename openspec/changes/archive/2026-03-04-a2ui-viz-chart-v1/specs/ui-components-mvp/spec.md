## MODIFIED Requirements

### Requirement: Viewer profile ships stateless, replayable components
UI kit MUST 包含一组面向 Viewer 的组件子集，这些组件是 stateless（不做 server-authoritative 写入），并且可以从 `sharedState.ui` 快照中回放渲染。

至少，组件集 MUST 提供：
- `ReportSection`
- `MetricCard`
- `DataTable`
- `Chart`
- `BarChart` (compatibility)
- `LineChart` (compatibility)
- `CitationList`
- `UnknownComponentCard`

#### Scenario: Viewer components render from props only
- **WHEN** 同一个 Viewer 组件在两次会话中使用相同且校验通过的 props 渲染
- **THEN** 其视觉输出稳定，不依赖外部服务或网络请求
