## Context

当前 `rivu-react` 的 Viewer/Workflow MVP 组件以 inline style 为主（见 `packages/rivu-react/src/ui-kit/*`），这带来两个直接问题：

1) **主题集成困难**：宿主应用往往已有 design tokens（暗色/品牌色/字体/圆角/间距），inline style 让覆盖成本高且不一致。  
2) **可替换/可扩展性不足**：复杂组件（如 DataTable、Workflow cards）缺少 slots/overrides 或 render hooks，宿主想替换子区域渲染需要 fork 组件。

PRD 明确要求 Rivu UI “像水一样”可渗透：theme tokens + slots/overrides + render hooks。后续专业图表（`Chart`）也需要统一的图表调色板与边框/网格等 token 支撑（参考 `../tambo` 的 `--chart-1..` 变量范式）。

## Goals / Non-Goals

**Goals:**
- 定义一套稳定的 theme tokens（CSS variables 优先），并给出默认值与覆盖方式。
- 为官方 UI kit 建立一致的“可嵌入 API”基线：
  - 组件普遍支持 `className`/`style`（最小可覆盖）
  - 复杂组件提供 slots/slotProps（或等价机制），允许宿主替换子渲染
  - 提供 render hooks（formatter 等）作为数据级扩展点（不进入协议状态）
- 跨框架一致：React/Svelte 适配层对同一套 tokens 有一致行为。
- 不引入强依赖（不强制 Tailwind/shadcn），同时允许宿主使用这些体系来覆盖 tokens。

**Non-Goals:**
- 不追求“一套 UI 风格适配所有产品”；Rivu 只提供合理默认与可覆盖机制。
- 不把视觉主题写入协议（`state.ui` 只承载 server-owned props/state，不承载 host theme）。
- v1 不做完整 design system（字体对/组件动效/复杂布局系统），聚焦 tokens + slots/overrides 的契约。

## Decisions

### 1) 主题令牌用 CSS variables，组件内使用 fallback

**Decision:** 以 CSS variables 作为主题令牌的主形式（例如 `--rivu-fg`、`--rivu-border`、`--rivu-radius`、`--rivu-chart-1..`）。组件渲染使用 `var(--token, <fallback>)`，保证“不引入任何 CSS 文件也能工作”，同时提供可选默认 tokens stylesheet 作为快速起步。  
**Why:** CSS variables 是跨框架、跨构建系统最通用的主题覆盖机制；同时与宿主现有 tokens（Tailwind/shadcn/自研）可直接对接。  
**Alternatives:** 强制引入 Tailwind/shadcn（与“像水”冲突）；纯 inline style（难以系统化覆盖）。

### 2) 统一组件可覆盖 API：`className/style` + `slots/slotProps`

**Decision:** 官方组件统一提供最小覆盖入口：
- 通用：`className?: string`、`style?: CSSProperties`
- 复杂组件：`slots`（子组件替换）+ `slotProps`（对子组件注入 props），或在 Svelte 中提供等价的 slot/prop 机制
  
**Why:** 这是“嵌入既有系统”的门票：宿主必须能替换空态、cell 渲染、actions 区域等关键子结构。  
**Alternatives:** 仅靠 CSS 覆盖（无法替换结构/行为）；让宿主 fork（维护成本高）。

### 3) Render hooks 仅作用于展示层，不进入协议状态

**Decision:** formatter/linkifier/markdown renderer 等“展示级扩展点”属于宿主本地配置，不写入 `state.ui`，也不影响回放正确性。  
**Why:** 这类逻辑通常与宿主 locale/设计系统/安全策略相关，协议化会导致不必要的耦合与兼容问题。  
**Alternatives:** 将 formatter 作为组件 props（会膨胀 server payload，且跨语言/回放困难）。

### 4) 图表调色板 tokens 与 UI tokens 同源

**Decision:** 图表 palette（至少 4~6 个颜色）作为 UI tokens 的一部分，供 `Chart`/兼容 `BarChart/LineChart` 共用；默认值可参考 `../tambo` 的 `--chart-1..` 经验，但保持 Rivu 自有命名与最小集合。  
**Why:** 图表是最敏感的主题集成点之一；将其纳入 tokens 能避免每个图表组件各自决定颜色。  
**Alternatives:** 图表组件自带颜色常量（宿主难以统一品牌色/暗色）。

## Risks / Trade-offs

- [视觉回归] 从 inline style 迁移到 tokens + classes 可能影响现有 demo 外观 → 提供默认 tokens + regression demo，并保持 fallback 值与当前风格接近。
- [API 复杂度] slots/overrides 会增加 props 复杂度 → 限制在“复杂组件”上（DataTable/Workflow cards），小组件只提供 className/style。
- [跨框架对齐] React 与 Svelte 的 slots 表达不同 → 在 spec 中定义“语义一致”，实现层使用各自 idiomatic 方式。
