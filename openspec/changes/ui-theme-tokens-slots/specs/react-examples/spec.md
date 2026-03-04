## ADDED Requirements

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
