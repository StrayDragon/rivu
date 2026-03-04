## Context

- 当前 `packages/rivu-react` 的 `BarChart/LineChart` 属于 MVP 级别的“简化渲染”，不满足 Viewer（Crystalith）面向报表/审阅的产品要求（坐标轴/刻度/tooltip/legend/主题/响应式等）。
- 我们希望把 Rivu 的 `state.ui` 作为 A2UI（Agent-to-UI）组件描述载体：智能体生成 UI 结构与组件描述；AG-UI 负责事件流、同步与回放。
- 参考 `../tambo/packages/ui-registry/src/components/graph/graph.tsx` 的交互与体验范式（通用 Graph 组件、loading/错误边界、响应式容器、主题色变量），但在 Rivu 侧采用 D3 渲染引擎，并保持 headless-first + 可嵌入（“像水”）原则。

## Goals / Non-Goals

**Goals:**
- 提供一个 Viewer（stateless）通用图表组件 `Chart`（schemaVersion: 1），覆盖 `bar/line/pie`（v1）。
- 定义 token-efficient 的图表 props 结构，使智能体能够在有限 token 预算下生成可回放的图表 UI（重点在数据表示与编码映射）。
- 使用 D3（模块化导入）实现专业 SVG 渲染：坐标轴/网格/tooltip/legend/响应式布局，并支持主题变量覆盖。
- 保持向后兼容：`BarChart/LineChart` 可作为兼容层（alias/映射），逐步引导迁移到 `Chart`。

**Non-Goals:**
- v1 不引入图表交互回传（过滤、brush、缩放等）及其服务端 SDK 处理链路（未来单独提案）。
- v1 不优化大规模数据（成千上万点）的性能（优先 SVG + 小数据）；如需 Canvas/WebGL 属于后续工作。
- 不改变 `rivu-kernel` 的协议/事件语义（仍通过 `STATE_SNAPSHOT/STATE_DELTA` 驱动 `state.ui`）。

## Decisions

### 1) 单一 `Chart` 组件优先（通用 chart spec）

**Decision:** 新增 `Chart` 作为 Viewer 图表的统一入口，采用 `mark + data + encoding + options` 的通用结构。  
**Why:** 参考 Tambo 的 Graph（一个组件覆盖多种图表）能显著降低注册与集成复杂度；同时对智能体生成更友好（减少组件类型分支）。  
**Alternatives:** 保留 `BarChart/LineChart/PieChart` 三组件并分别扩展。缺点是 schema 碎片化、扩展成本高、A2UI 生成难度更大。

### 2) 数据用 `columns + rows`（行列式）而不是对象数组

**Decision:** `Chart` props 的 `data` 使用 `columns: string[]` 与 `rows: (string|number|null)[][]`。  
**Why:** 这是最直接的 token 优化手段：避免每行重复 key；同时结构稳定、易校验、易导出。  
**Alternatives:** `rows: Array<Record<string, ...>>`（易读但 token 大）；`labels + datasets`（与 Tambo 类似但对多字段/编码扩展不够通用）。

### 3) D3 作为渲染引擎，SVG 作为默认输出

**Decision:** 使用 D3 的模块化能力（`d3-scale/d3-shape/d3-axis/d3-array` 等）驱动 SVG 渲染。  
**Why:** D3 更接近“渲染内核”，利于跨框架复用（React/Svelte 都可封装同一渲染函数），且能精确控制轴/布局/样式。SVG 对导出与审阅友好。  
**Alternatives:** Recharts/Visx（更 React 绑定）；Vega-Lite（规范强但体积与学习成本更高）；ECharts（运行时大、DOM/CANVAS 策略不同）。

### 4) 主题与可嵌入：CSS 变量优先

**Decision:** 图表默认使用一组可覆盖的 CSS variables（例如 `--rivu-chart-1..n`、`--rivu-border`、`--rivu-muted-foreground`），并提供合理的 fallback。  
**Why:** 参考 Tambo 的 `--chart-1..` 设计，主题变量是“像水”集成到宿主设计系统的最低摩擦路径。  
**Alternatives:** 全 inline style（难以适配暗色/品牌色）；强制引入 Tailwind/shadcn（与集成哲学冲突）。

### 5) 兼容策略：保留 `BarChart/LineChart` 但推荐迁移

**Decision:** `BarChart/LineChart` 保留为兼容入口（内部映射到 `Chart` 或继续支持旧 props），`Chart` 成为推荐的 A2UI 图表组件。  
**Why:** 现有 demo/用户可能已依赖旧组件；保持回放稳定，同时允许新 spec 逐步替换。  
**Alternatives:** 直接 BREAKING 移除旧组件（迁移成本高，且与“可渐进采用”冲突）。

## Risks / Trade-offs

- [Bundle 体积] 引入 D3 可能增大浏览器包体 → 采用模块化导入、避免 `import * as d3 from "d3"`；必要时拆分为可选依赖或按需动态 import。
- [Spec 复杂度] 通用 chart spec 容易过度设计 → v1 限定 mark 与 encoding 子集（bar/line/pie + x/y/series/value），把高级能力留给后续提案。
- [可访问性] 纯图形输出可读性不足 → 设计中要求提供可选的文本摘要/表格回退（至少 aria-label + 基本 range）。
- [兼容性] 同时存在旧 chart props 与新 spec → 在 registry 层明确 schemaVersion/组件类型，避免 silent mismatch；迁移策略写入 spec 与文档。
