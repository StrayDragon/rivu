## ADDED Requirements

### Requirement: Workflow profile 支持交互型 Chart 的 round-trip
UI kit MUST 支持将 `Chart` 作为 workflow 组件使用：在启用交互时，`Chart` 能发出标准化的 `ui.v1.event`（见 `chart-interactions`），并在服务端 `STATE_DELTA` 回写 selection 后更新渲染（高亮/标签/提示）。

#### Scenario: Chart emits setSelection with baseRevision
- **WHEN** 用户点击图表 datum
- **THEN** 前端发送 `CUSTOM(name="ui.v1.event")`，`eventName="chart.setSelection"`，并携带正确的 `componentId/clientRequestId/baseRevision`

