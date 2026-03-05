# Viewer: PivotTable + Heatmap（v1）

本页描述两个 **Viewer-only / stateless / export-friendly** 组件：
- `PivotTable@1`：按维度透视 + 聚合（纯函数计算）
- `Heatmap@1`：二维编码（x/y/value）+ 颜色映射（基于 `--rivu-chart-*` tokens）

它们都支持通过 `props.dataRef.datasetId` 引用 `sharedState.ui.datasets`，以减少快照体积并提升导出/回放一致性。

## 1) PivotTable@1

**Component**
- `type: "PivotTable"`
- `schemaVersion: 1`

**Props（概念形状，以 `rivu-ui-spec` 为真值）**
- `dataRef?: { datasetId: string }`：引用 `sharedState.ui.datasets[datasetId]`
- `data?: { columns: string[]; rows: (string|number|null)[][] }`：可选内联数据（当 `dataRef` 存在时以 `dataRef` 为准）
- `rows: string[]`：行维度列名（至少 1 项）
- `columns: string`：列维度列名
- `value: string`：度量列名
- `agg: "sum" | "count" | "avg" | "min" | "max"`
- `options?: { title?: string; unit?: string; showTotals?: boolean }`

**数据要求与降级**
- 当 dataset 缺失、列名不匹配、或聚合过程中遇到非法值（例如 `agg!=count` 但 `value` 列出现非 number）时，组件会以 viewer-safe 方式降级展示诊断信息，不会导致页面/导出崩溃。

## 2) Heatmap@1

**Component**
- `type: "Heatmap"`
- `schemaVersion: 1`

**Props（概念形状，以 `rivu-ui-spec` 为真值）**
- `dataRef?: { datasetId: string }`
- `data?: { columns: string[]; rows: (string|number|null)[][] }`
- `encoding: { x: string; y: string; value: string }`
- `options?: { title?: string; unit?: string; height?: number }`

**颜色映射**
- `value` 采用 `min/max` 线性归一化。
- 颜色基于 `--rivu-chart-*` tokens（默认实现使用 `--rivu-chart-2` → `--rivu-chart-1` 的线性插值）。

**数据要求与降级**
- `encoding.value` 列必须是 `number | null`；遇到非数值会降级为 viewer-safe 错误。
- 缺失 dataset / 列名不匹配同样会安全降级。

## 3) Datasets 与 limits 指南

- 推荐把原始数据或预聚合结果放到 `sharedState.ui.datasets`，组件通过 `dataRef` 引用。
- `PivotTable/Heatmap` v1 不做大规模性能优化：当数据量较大时，建议在服务端或生成阶段预聚合/裁剪后再下发。
- 组件与导出链路都是确定性的：同一份 `STATE_SNAPSHOT` 多次渲染应产生稳定输出，并且不进行网络请求。

