## ADDED Requirements

### Requirement: Chart 交互 eventName/payload 必须可校验
当 `ui.v1.event` 作用于 `component.type="Chart"`（workflow）时，系统 MUST 对 `eventName/payload` 做严格校验，并拒绝不符合 `chart-interactions` 规范的输入。

#### Scenario: Reject invalid chart selection payload
- **WHEN** `eventName="chart.setSelection"` 但 `payload.selection` 缺失或类型不合法
- **THEN** SDK validators/processor 拒绝该事件，不进入业务逻辑

