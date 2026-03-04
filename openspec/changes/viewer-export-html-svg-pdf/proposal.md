## Why

Crystalith 的 Viewer 使用画像强调“可回顾/可审阅/可分发”。当前仓库已有结构化 JSON snapshot 的导出建议（用于回放 `sharedState.ui`），但缺少面向真实业务的“交付格式”：

- HTML：用于分享、审阅、留档（可包含表格/图表的静态呈现）
- SVG：用于图表等矢量资源导出（便于高质量排版与二次处理）
- PDF：用于正式报告/合规留档（最常见的外部交付格式）

如果没有一个稳定的导出能力，Viewer 的“快照可回放”价值无法完整落地到产品工作流。

## What Changes

- 定义 Viewer Export Formats（v1）规范：
  - 输入：结构化 JSON snapshot（含 `sharedState` / messages / toolCalls）
  - 输出：HTML（可独立打开）、SVG assets（按需）、PDF（可选实现）
  - 约束：导出必须确定性、无外部网络依赖、并对未知组件有降级策略
- 增补 UI kit 的可导出要求：
  - Viewer 组件必须支持静态渲染（不依赖浏览器交互状态）
  - 图表优先 SVG 输出以保证清晰度与可排版性
- 补齐示例与文档：
  - React demo 增加 ExportMenu（JSON/HTML/SVG）
  - 文档说明“从快照到 HTML/PDF”的推荐链路与可选依赖（例如 Playwright）

## Capabilities

### New Capabilities
- `viewer-export-formats`: 定义 Viewer 导出格式（HTML/SVG/PDF）的输入/输出契约、确定性约束与降级策略。

### Modified Capabilities
- `event-store-snapshot`: 扩展 export 相关 REQUIREMENTS（在 JSON snapshot 基础上支持衍生 HTML/SVG/PDF）。
- `ui-components-mvp`: Viewer 组件需要满足可导出/可静态渲染要求（UnknownComponent 仍需降级）。
- `framework-adapters`: 适配层提供导出入口（不强制 Provider），并文档化用法。
- `react-examples`: demo 覆盖导出用例（至少 JSON + HTML + SVG）。

## Impact

- `docs/`：新增导出指南与格式说明。
- `packages/`：可能新增导出相关的工具包/模块（TS 侧优先），并在 adapter 中暴露 API。
- `examples/`：demo 增加导出 UI 与回归验收路径。
