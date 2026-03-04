## ADDED Requirements

### Requirement: Python SDK 解码与校验 `ui.v1.capabilities`
Python SDK MUST 提供 strict encode/decode/validate utilities for `CUSTOM(name="ui.v1.capabilities")`。

#### Scenario: Reject invalid schemaVersion range
- **WHEN** `maxSchemaVersion < minSchemaVersion`
- **THEN** SDK validators 拒绝该 capabilities payload

### Requirement: Python SDK 提供组件兼容性判断与降级选择 helper
Python SDK MUST 提供 helper utilities，用于：
- 判断某个 `(componentType, schemaVersion)` 是否被客户端 capabilities 支持
- 在一组候选组件（类型/版本）中选择最兼容的一个（或返回 “无可用”）

#### Scenario: Choose a compatible fallback component
- **WHEN** 客户端不支持 `Chart@1`，但支持 `BarChart@1`
- **THEN** helper 能从候选集合中选择 `BarChart@1` 作为兼容降级

