## ADDED Requirements

### Requirement: Rust SDK 解码与校验 `ui.v1.capabilities`
Rust SDK MUST 提供 strict encode/decode/validate utilities for `CUSTOM(name="ui.v1.capabilities")`。

#### Scenario: Reject missing required fields
- **WHEN** capabilities payload 缺失 `v` 或 `components`
- **THEN** SDK validators 拒绝该 payload

### Requirement: Rust SDK 提供组件兼容性判断与降级选择 helper
Rust SDK MUST 提供 helper utilities，用于：
- 判断某个 `(componentType, schemaVersion)` 是否被客户端 capabilities 支持
- 在一组候选组件（类型/版本）中选择最兼容的一个（或返回 “无可用”）

#### Scenario: Choose the highest supported schemaVersion
- **WHEN** 客户端对 `MetricCard` 支持 `minSchemaVersion=1,maxSchemaVersion=2` 且候选包含 `MetricCard@1` 与 `MetricCard@2`
- **THEN** helper 选择 `MetricCard@2`

