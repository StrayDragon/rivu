## ADDED Requirements

### Requirement: Rust SDK 提供 Chart 交互处理器
Rust SDK MUST 提供内置的 chart 交互处理器，用于将 `chart.setSelection/chart.clearSelection` 转换为对 `sharedState.ui` 的受控更新（JSON Patch ops），并维护 `revision` 并发语义。

#### Scenario: Processor rejects out-of-range rowIndex
- **WHEN** `rowIndex` 超出当前数据集 rows 范围
- **THEN** SDK 拒绝该事件并返回可诊断错误（不得写入非法 selection）

