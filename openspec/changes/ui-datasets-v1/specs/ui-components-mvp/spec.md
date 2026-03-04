## ADDED Requirements

### Requirement: Viewer components support dataset references
Viewer 组件中，`DataTable` MUST 支持通过 `dataRef` 引用 `sharedState.ui.datasets`（同时允许保留内联数据作为兼容路径）。

当 `dataRef` 存在时，组件 MUST 优先使用引用的数据集（并遵循缺失引用的 viewer-safe 降级策略）。

#### Scenario: DataTable prefers dataRef when present
- **WHEN** `DataTable` 同时提供内联数据与 `dataRef`
- **THEN** 组件优先使用 `dataRef` 解析的数据渲染

