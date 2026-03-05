## Context

当前仓库已具备：
- `sharedState.ui.datasets`（列式 `columns + rows`）与 `dataRef` 引用；
- Viewer 组件（`DataTable`、`Chart` 等）可从快照回放渲染并支持导出；
- tokens（`--rivu-*`）与基本 slots/overrides 机制。

但缺少两类常见报表形态：
- **PivotTable**：按维度聚合/透视展示（行/列维度 + 聚合度量 + totals）
- **Heatmap**：二维矩阵/类别交叉的强弱对比（颜色映射）

本变更在不引入交互回传的前提下，为 Viewer profile 增加这两类 stateless 组件，并把它们接入 datasets 与导出链路。

## Goals / Non-Goals

**Goals:**
- 提供 `PivotTable@1` 与 `Heatmap@1` 两个 Viewer-only（stateless）组件：
  - 只从 `sharedState.ui.components[componentId].props`（以及 datasets 引用）渲染
  - 不发网络请求、同一输入可确定性渲染（适用于回放与导出）
- 两个组件都支持 `dataRef.datasetId` 引用 datasets，并具备缺失/非法引用的 viewer-safe 降级。
- 组件视觉遵循 `--rivu-*` tokens（边框/背景/圆角/调色板），保证可融入宿主设计系统。
- React demo 与 HTML export 都覆盖这两类组件作为回归用例。

**Non-Goals:**
- 不引入 `ui.v1.event` 交互回传（Heatmap hover/selection、Pivot 展开折叠等都属于后续 change）。
- 不把 pivot/heatmap 的“计算语义”协议化到服务端：v1 以客户端/导出链路的纯函数计算为准；宿主若需要更强控制，可在服务端预先产出结果 dataset 再用 `DataTable/Chart` 渲染。
- 不在 v1 处理超大规模数据的性能优化（由 limits + 预聚合策略约束）。

## Decisions

### 1) 组件均为 stateless，数据来源优先 datasets

**Decision:** `PivotTable` 与 `Heatmap` 均为 stateless 组件；它们优先从 `props.dataRef.datasetId` 解析数据集（`sharedState.ui.datasets[datasetId]`）。  
组件 MAY 支持 `props.data` 内联 dataset 作为便利输入；当 `dataRef` 存在时 MUST 优先使用 `dataRef`。

**Why:** datasets 复用能显著减少 patch/token 体积，并让导出与回放共享同一份数据真值。

### 2) PivotTable 聚合为纯函数，聚合器集合固定且可校验

**Decision:** `PivotTable@1` 的聚合行为由组件/导出链路以纯函数实现，聚合器集合固定为：
- `sum | count | avg | min | max`

props 通过列名引用 dataset 的列，所有引用列 MUST 存在；否则降级为 viewer-safe error。

**Why:** 固定聚合器集合让 props 可校验、可回放、可跨语言实现（如未来需要 server-side 预计算）。

### 3) Heatmap 采用显式 encoding（x/y/value），颜色映射使用 tokens palette

**Decision:** `Heatmap@1` 使用显式 `encoding: { x, y, value }`，均为列名引用。
- `value` MUST 为 number 或 null
- 颜色映射使用 `--rivu-chart-*` palette（按 value 的 min/max 线性插值），并提供可选 `options.unit/title`

**Why:** 与 `Chart` 的 encoding 思路一致，且 token 体系能自然融入宿主主题。

### 4) 降级策略：不抛到页面外，不依赖 UnknownComponent 兜底

**Decision:** 对缺失 dataset、列名不存在、或 props 校验失败的情况：
- registry MUST 先做 schema 校验；
- 渲染层 MUST 以 viewer-safe 的 `ComponentErrorCard`（或等价）展示诊断信息；
- 页面与导出流程保持可用（不会因为单个组件失败而中断）。

**Why:** Viewer 回放/导出必须“宁可降级也不炸”；错误要可诊断但不泄露敏感数据。

## API Shape (v1)

### PivotTable

- `type = "PivotTable"`
- `schemaVersion = 1`

Props（概念形状；以 `rivu-ui-spec` 的 zod schema 为准）：
- `dataRef?: { datasetId: string }`
- `data?: { columns: string[]; rows: (string|number|null)[][] }`（可选内联）
- `rows: string[]`（行维度列名，至少 1 项）
- `columns: string`（列维度列名）
- `value: string`（度量列名）
- `agg: "sum"|"count"|"avg"|"min"|"max"`
- `options?: { title?: string; unit?: string; showTotals?: boolean }`

### Heatmap

- `type = "Heatmap"`
- `schemaVersion = 1`

Props（概念形状；以 `rivu-ui-spec` 的 zod schema 为准）：
- `dataRef?: { datasetId: string }`
- `data?: { columns: string[]; rows: (string|number|null)[][] }`（可选内联）
- `encoding: { x: string; y: string; value: string }`
- `options?: { title?: string; unit?: string; height?: number }`

## Migration Plan

1) 在 `rivu-ui-spec` 增加 `PivotTable/Heatmap` props schema + vectors。  
2) 在 `rivu-react` 实现组件与 registry registrations，并接入 datasets + tokens。  
3) 扩展 HTML export 渲染支持，并在 demo 中增加回归用例。  
4) 补齐 docs：何时使用、如何组织 datasets、以及导出注意事项。  
