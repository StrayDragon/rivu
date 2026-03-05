## ADDED Requirements

### Requirement: Export inputs are structured JSON snapshots (v1)
Viewer 导出 MUST 以结构化 JSON snapshot 作为输入真值。

该 snapshot MUST 至少包含：
- `sharedState`（含 `sharedState.ui`）
- `messages`
- `toolCalls`

推荐（SHOULD）使用稳定的导出 envelope 形状（与 `docs/export-review.md` 对齐）：
- `schema: "rivu.export.v1"`
- `exportedAtMs: number`
- `lastSeq: number`
- `sharedState: object`
- `messages: array`
- `toolCalls: array`

#### Scenario: Export consumes a snapshot
- **WHEN** 服务拿到一个合法的导出 JSON snapshot
- **THEN** 导出系统可在不依赖事件重放的情况下生成导出产物

### Requirement: HTML export is deterministic and offline
HTML 导出 MUST 满足：
- 确定性：同一输入 snapshot 多次导出结果稳定
- 离线：导出过程 MUST NOT 发起任何外部网络请求
- 降级：未知组件 MUST 以占位/摘要形式导出且不中断流程

HTML 导出结果 SHOULD 是一份可独立打开的完整 HTML 文档（包含 `<head>/<body>`），并避免引用外部网络资源（例如 `http(s)://...`）。

#### Scenario: Unknown component does not break export
- **WHEN** snapshot 中包含未知 `component.type` 或 schemaVersion 不匹配的组件
- **THEN** HTML 导出仍成功，并包含该组件的降级摘要块

### Requirement: SVG assets are supported for charts
对于图表类组件，导出系统 MUST 支持产出 SVG（内联或独立 asset）。

#### Scenario: Chart exports as SVG
- **WHEN** snapshot 中包含可导出的图表组件（例如 `Chart`）
- **THEN** 导出结果包含对应的 SVG 表达

### Requirement: PDF export may be derived from HTML
若系统提供 PDF 导出，则 PDF 导出 MUST 允许通过“HTML → headless browser 渲染 → PDF”的方式派生。

#### Scenario: Optional PDF export
- **WHEN** 宿主环境提供 headless browser 渲染能力（例如 Playwright）
- **THEN** 系统可从同一 HTML 导出结果派生 PDF
