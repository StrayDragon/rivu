## ADDED Requirements

### Requirement: Adapters 提供 registry → capabilities 的生成函数
`rivu-react` 与 `rivu-svelte` MUST 提供一个工具函数，用于从当前 registry 生成 `ui.v1.capabilities` payload（`value` 部分）。

该工具函数 MUST：
- 覆盖 registry 中已注册的所有 `componentType`
- 为每个组件填入其支持的 `minSchemaVersion/maxSchemaVersion`
- 默认生成 `features` 字段，并至少包含：
  - `datasets: boolean`
  - `lifecycle: boolean`
  - 当 `Chart` 已注册时，包含 `chart.marks: string[]` 与 `chart.interactions: string[]`（不支持时可为空数组）
- 允许宿主覆盖/扩展 `features`（例如补齐 marks/interactions、或声明导出 formats）

#### Scenario: Capabilities reflects registered components
- **WHEN** registry 注册了 `DataTable`（schemaVersion=1）与 `Chart`（schemaVersion=1）
- **THEN** 生成的 capabilities `components` 包含 `DataTable` 与 `Chart`，且两者的 `minSchemaVersion/maxSchemaVersion` 覆盖 `1`

#### Scenario: Capabilities includes recommended features keys
- **WHEN** registry 中包含 `Chart`，且宿主未提供额外 features 覆盖
- **THEN** 生成的 capabilities `features` 至少包含 `datasets/lifecycle/chart.marks/chart.interactions` 这些 key
