## Context

当前 Viewer 的最小闭环是：服务端写入 `STATE_SNAPSHOT/STATE_DELTA` → 前端回放 `sharedState.ui` → UI 组件确定性渲染。  
导出能力需要把这条链路延伸到“可分发格式”，同时保持：

- 结果确定性：同一 snapshot 导出结果稳定
- 无网络依赖：导出过程不发起外部请求
- 降级稳定：未知组件/版本不匹配时仍能导出（以占位/摘要形式）

## Goals / Non-Goals

**Goals:**
- 明确定义 v1 导出格式契约（HTML/SVG/PDF）与最小字段集合。
- 提供“从 JSON snapshot → HTML” 的确定性导出路径（v1 基础能力）。
- SVG assets 对图表等组件有明确要求，便于高质量排版与后续 PDF 生成。
- PDF 导出作为可选实现：允许宿主使用 Playwright/Chromium 等从 HTML 生成。

**Non-Goals:**
- v1 不做“可编辑报告”系统（导出是静态审阅/留档）。
- v1 不要求导出包含所有运行时交互状态（hover/展开等属本地 ephemeral）。
- v1 不强制在所有语言（TS/Python/Rust）都落地完整 PDF 引擎；规范先行，按需实现。

## Decisions

### 1) 导出以 JSON snapshot 为唯一输入真值

**Decision:** 导出输入以结构化 JSON snapshot 为准（含 `sharedState`、messages、toolCalls），不依赖重放全量事件序列。  
**Why:** Viewer 主要目标是审阅结果；快照是最稳定、最省 replay 成本的基线。  
**Alternatives:** 事件序列重放会受 replay window/compaction 影响，且成本更高。

### 2) HTML 作为核心交付格式，PDF 通过 HTML 渲染派生

**Decision:** v1 的核心实现目标是 HTML 导出；PDF 作为从 HTML 派生的可选能力（推荐 Playwright/Chromium）。  
**Why:** HTML 能承载复杂布局与 SVG，并能作为 PDF 的渲染源；同时便于调试与审阅。  
**Alternatives:** 直接生成 PDF 需要复杂排版与字体/分页处理，成本更高。

### 3) 图表优先 SVG，保持矢量质量

**Decision:** Viewer 图表（例如 `Chart`）导出优先使用 SVG（内联或独立 asset）。  
**Why:** SVG 在 PDF/打印场景质量最好，且与主题 tokens 配合良好。  
**Alternatives:** Canvas 导出需要额外 rasterize，可能丢失清晰度。

### 4) UnknownComponent 在导出中必须可见且可诊断

**Decision:** UnknownComponent 导出必须包含最小可诊断信息（type/schemaVersion/props 摘要），并保持导出链路不中断。  
**Why:** 导出与审阅场景中“不中断”优先于“完美渲染”。  
**Alternatives:** 导出失败会破坏审阅/留档流程。

## Risks / Trade-offs

- [样式一致性] HTML/CSS 渲染与运行时可能有差异 → 建议复用 UI theme tokens（CSS variables），并提供默认 tokens。
- [依赖体积] PDF 依赖 Chromium/Playwright → 作为可选依赖与文档推荐，不强制打进核心包。
- [安全] 导出 HTML 需避免注入风险 → 组件渲染不得输出不可信 HTML；必要时进行 URL/文本净化（与 security change 对齐）。

