## 1. Theme Tokens（CSS variables）

- [x] 1.1 定义最小 token 集合与命名（bg/fg/muted/border/radius/shadow + `--rivu-chart-*` 调色板）
- [x] 1.2 在 UI kit 中统一使用 `var(--token, <fallback>)`（保证“不引入 CSS 也可工作”）
- [x] 1.3 提供可选的默认 tokens stylesheet（快速起步），并在文档中说明覆盖方式与暗色策略

## 2. 组件 API 基线（override 入口）

- [x] 2.1 为所有 MVP 组件补齐一致的 `className`（必需）与 `style`（建议）透传策略
- [x] 2.2 Viewer 组件：迁移 `ReportSection/MetricCard/DataTable/BarChart/LineChart/CitationList/UnknownComponentCard` 到 tokens 驱动的样式实现
- [x] 2.3 Workflow 组件：迁移 `ApprovalCard/FormCard` 到 tokens 驱动的样式实现（保持 server-authoritative 行为不变）

## 3. Slots / Render Hooks（复杂组件）

- [x] 3.1 `DataTable`：提供 cell formatter 或 cell slot（以及 empty state slot）以支持宿主定制而不修改 `state.ui` snapshot
- [x] 3.2 Workflow cards：至少提供 actions/status 区域的 slots/overrides（满足最小“替换子渲染”能力）
- [x] 3.3 文档化 slots API（React/Svelte 语义一致，形式可 idiomatic）

## 4. Demo & Docs

- [x] 4.1 `examples/rivu-react-demo`：新增主题覆盖示例（含图表 palette token 覆盖）
- [x] 4.2 `examples/rivu-react-demo`：新增 slots/overrides 示例（例如替换 DataTable empty state / 自定义数值格式化）
- [x] 4.3 `docs/`：新增“融入现有 design system”最小指南（tokens 覆盖 + slots 入口）

## 5. Tests & Verification

- [x] 5.1 为 `className/style` 与 slots 行为补充最小单测（不依赖视觉快照）
- [x] 5.2 回归运行：`pnpm test` + demo 手动验收（暗色/覆盖 tokens/slots 生效）
