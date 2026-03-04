## Context

现有 Viewer 组件覆盖了“结构化展示”（指标、表格、图表）但缺少“差异表达”。Diff UI 需要满足：
- 同一输入确定性渲染（回放/导出一致）
- viewer-safe（超大文本不炸页面，错误可诊断）
- 可主题化（融入宿主）

本变更以最小、稳定的 v1 契约补齐 `DiffView`，并把它纳入导出与示例。

## Goals / Non-Goals

**Goals:**
- 提供 `DiffView@1` stateless 组件，可从 `sharedState.ui` 快照确定性渲染。
- 支持两种布局：
  - `mode="unified"`（默认）：单列展示加/删/不变行
  - `mode="split"`：左右对照
- 默认算法为“按行 diff”，渲染为纯文本（不注入 HTML，不做网络请求）。
- 支持 viewer-safe 限制：可配置/可校验的 `maxChars`/`maxLines`（超过则截断并提示）。
- HTML export 与 React demo 均覆盖该组件。

**Non-Goals:**
- 不在 v1 做字符级高亮、语法高亮、或复杂 merge UI（可在后续 change 结合 render hooks/highlight 扩展）。
- 不在 v1 支持任意 JSON 结构 diff（先聚焦文本/代码片段 diff；结构化对比建议用 DataTable/Chart）。

## Decisions

### 1) 只做纯文本 line-diff，保证确定性与安全

**Decision:** `DiffView@1` 使用纯文本按行 diff 输出；任何内容都以 text 节点渲染（不解释 HTML/Markdown）。

**Why:** Viewer 导出与回放的首要目标是确定性与安全；富文本/高亮留给 render hooks 的独立能力。

### 2) 超限输入必须可回放且可导出

**Decision:** props schema MUST 支持限制字段：
- `limits.maxChars`
- `limits.maxLines`

实现 MUST 在渲染前执行裁剪，并在 UI 上显示 “truncated” 提示；导出 MUST 复用相同裁剪规则。

**Why:** 大文本 diff 是典型 DoS/体验风险点；限制必须集中且确定性一致。

## API Shape (v1)

- `type = "DiffView"`
- `schemaVersion = 1`

Props（概念形状；以 `rivu-ui-spec` 的 zod schema 为准）：
- `title?: string`
- `beforeLabel?: string`
- `afterLabel?: string`
- `before: string`
- `after: string`
- `mode?: "unified" | "split"`（默认 `unified`）
- `limits?: { maxChars?: number; maxLines?: number }`

## Migration Plan

1) 在 `rivu-ui-spec` 增加 `DiffView@1` schema + vectors。  
2) 在 `rivu-react` 实现组件 + registration，并接入 tokens + truncation 降级。  
3) 扩展 HTML export 支持 DiffView。  
4) 更新 `examples/rivu-react-demo` 与 docs，增加回归用例与使用指南。  
