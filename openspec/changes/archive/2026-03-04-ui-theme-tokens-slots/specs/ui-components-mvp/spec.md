## ADDED Requirements

### Requirement: MVP 组件必须可主题化且可覆盖
所有 MVP UI 组件 MUST 能通过 Rivu theme tokens（CSS variables）进行主题化，并且 MUST 允许宿主覆盖。

至少：
- 当存在 token 时，组件 MUST 避免硬编码非平凡的颜色调色板
- 组件 MUST 接受 `className` 覆盖
- 复杂组件 SHOULD 暴露 slots/overrides API

#### Scenario: Viewer 组件遵循宿主主题
- **WHEN** 宿主覆盖 foreground/background/border tokens
- **THEN** Viewer 组件使用被覆盖后的 tokens 渲染，而不需要 fork

### Requirement: DataTable 提供 cells 的 render hooks / slot overrides
`DataTable` MUST 提供一种方式让宿主自定义 cell 渲染（例如 formatter 或 cell slot），且不需要修改 server-owned `props`。

#### Scenario: 宿主自定义数值格式化
- **WHEN** 宿主为数值 cells 提供 formatter/render hook
- **THEN** 数值使用宿主 formatter 渲染，同时底层 `sharedState.ui` 快照保持不变
