## Why

当前 `rivu-react` UI kit 的 Viewer/Workflow 组件大量使用 inline style，缺少统一的 theme tokens、`className`/`style` 透传策略以及 slots/overrides 机制。这会导致：

- 难以融入宿主应用既有设计系统（暗色/品牌色/字体/间距/圆角等）
- 难以按需替换子区域渲染（例如 DataTable 的 toolbar、empty state、cell formatter）
- 难以把后续“专业图表（Chart）”的配色与外观纳入统一主题体系

这与 PRD 的“像水一样可塑形（theme tokens + slots/overrides）”目标不一致，需要尽早把“可定制”能力产品化成稳定契约。

## What Changes

- 定义 Rivu UI kit 的主题令牌（theme tokens）：
  - 以 CSS variables 为主（支持宿主覆盖，不强制 Tailwind/shadcn）
  - 包含基础色彩/边框/文本/圆角/阴影/间距，以及图表调色板（参考 `../tambo` 的 `--chart-1..` 设计范式）
  - 组件默认使用 `var(--rivu-*, <fallback>)`，保证“不引入 CSS 也能工作”，同时提供可选的默认 token stylesheet
- 为官方组件引入一致的“可嵌入 API”：
  - 所有复杂组件支持 `className`/`style` 覆盖（最小约束）
  - 关键组件提供 `slots`/`slotProps` 或等价机制（DataTable/Workflow cards 等）以允许宿主替换子渲染
  - 提供 render hooks（formatter/linkifier 等）的推荐扩展点（不进入协议状态）
- 更新 demo 与文档：
  - React demo 展示：宿主覆盖 tokens（含暗色/图表配色）与 slots 的例子
  - Integration Guide 增加 “如何把 Rivu 融入现有 design system” 的最小指南

## Capabilities

### New Capabilities
- `ui-theme-tokens-slots`: 定义 UI kit 的 theme tokens、slots/overrides 契约与最低可定制要求（跨 React/Svelte 适配层一致）。

### Modified Capabilities
- `ui-components-mvp`: 为 v1 MVP 组件补充规范性要求（className/style、theme token 使用、slots/overrides 的最低集合）。
- `framework-adapters`: 适配层需暴露/文档化主题集成与覆盖方式（Provider-free 默认）。
- `react-examples`: demo 需覆盖 tokens 覆盖与 slots/overrides 的展示与回归验证。

## Impact

- `packages/rivu-react`：组件实现从纯 inline style 迁移到“CSS variables + 可覆盖 className/slots”；新增可选默认 tokens stylesheet。
- `packages/rivu-svelte`：对齐同一套 tokens，并提供最小的 style/slot 覆盖示例（不强制引入全局样式）。
- `examples/rivu-react-demo`：新增主题覆盖与 slots 示例，作为集成基线。
- `docs/`：新增主题/定制指南，减少“如何融入现有系统”的不确定性。
