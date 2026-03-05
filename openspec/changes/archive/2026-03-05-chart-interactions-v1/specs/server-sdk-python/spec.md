## ADDED Requirements

### Requirement: Python SDK 提供 Chart 交互处理器
Python SDK MUST 提供内置的 chart 交互处理器，用于将 `chart.setSelection/chart.clearSelection` 转换为对 `sharedState.ui` 的受控更新（JSON Patch ops），并维护 `revision` 并发语义。

#### Scenario: Processor outputs patch ops for selection update
- **WHEN** SDK 处理一个合法的 `chart.setSelection` 事件
- **THEN** SDK 输出一组 patch ops，更新 `component.state.selection` 并递增 `component.revision`

