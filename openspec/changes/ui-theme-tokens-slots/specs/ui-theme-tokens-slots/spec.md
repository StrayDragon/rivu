## ADDED Requirements

### Requirement: UI kit 通过 CSS variables（带 fallback）实现主题化
UI kit MUST 支持通过 CSS variables（theme tokens）进行主题化。

组件 MUST 使用 `var(--token, <fallback>)`（或等价实现），以保证：
- UI 在不导入任何必需的全局 stylesheet 时也能正常工作
- 宿主应用可以覆盖 tokens 来匹配其设计系统

至少，token 集合 MUST 包含：
- background / foreground / muted / border tokens
- radius token（或 token 组）
- 至少 4 个互不相同的 chart palette 颜色

#### Scenario: 宿主覆盖 token 生效
- **WHEN** 宿主应用覆盖某个 Rivu CSS variable token（例如 border 或 chart palette）
- **THEN** 渲染出的组件反映被覆盖后的值

### Requirement: 组件支持 `className`/`style` 覆盖
所有发布的 UI kit 组件 MUST 接受 `className` 覆盖，并且 SHOULD 接受 `style` 覆盖（或框架等价机制），以允许宿主在不 fork 组件的情况下做局部样式调整。

#### Scenario: 宿主添加 className
- **WHEN** 宿主为 Viewer 组件传入 `className` 覆盖
- **THEN** 组件渲染时应用该额外 className

### Requirement: 复杂组件提供 slots/overrides
复杂 UI 组件（例如 tables 与 workflow cards）MUST 提供 slots/overrides 机制，允许宿主在不 fork 组件的情况下替换关键子区域（toolbar、empty state、cell renderer、actions area）。

slots API MUST 是可选的，并且在省略时 MUST 提供合理的默认行为。

#### Scenario: 宿主替换 empty state slot
- **WHEN** 宿主通过 slots API 替换复杂组件的 empty-state slot
- **THEN** 组件使用自定义 empty-state renderer 而非默认实现
