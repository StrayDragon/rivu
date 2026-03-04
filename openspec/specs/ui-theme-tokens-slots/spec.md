# ui-theme-tokens-slots Specification

## Purpose
Define the theming + customization surface for the UI kit: CSS variable theme tokens (with fallbacks), `className`/`style` overrides, and slots/overrides for replacing key sub-areas without forking components.
## Requirements
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

### Requirement: Theme tokens include typography and spacing primitives

The UI kit token set MUST include minimal typography and spacing primitives so hosts can align Rivu components with their design system without forking.

At minimum, the token set MUST include:
- a base font-family token
- at least two font-size tokens (e.g. `sm` and `base`)
- at least three spacing tokens usable for padding/gaps

#### Scenario: Host maps design-system typography tokens
- **WHEN** a host maps its own typography/spacing tokens into `--rivu-*`
- **THEN** Rivu components pick up the host typography/spacing without code changes

### Requirement: Complex components support `slotProps` injection

Complex components that already support `slots` MUST also support a `slotProps` mechanism (or framework-equivalent) to inject props/styling into default sub-areas without replacing the entire slot renderer.

At minimum, `DataTable` and workflow cards MUST expose `slotProps` for their key sub-areas (table/cells/actions/buttons/fields).

#### Scenario: Host injects className into default actions area
- **WHEN** a host provides `slotProps` for a workflow card actions area
- **THEN** the default actions renderer applies the injected props while preserving server-authoritative behavior

