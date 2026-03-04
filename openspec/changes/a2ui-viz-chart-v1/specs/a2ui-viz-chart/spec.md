## ADDED Requirements

### Requirement: Viewer 提供通用 Chart 组件（stateless）
UI kit MUST 提供一个 Viewer（stateless）的图表组件：
- `component.type = "Chart"`
- `component.schemaVersion = 1`

该组件 MUST 仅从 `sharedState.ui.components[componentId].props` 渲染，并且 MUST NOT 发起任何网络请求。

#### Scenario: Chart 能从快照渲染
- **WHEN** `STATE_SNAPSHOT` 包含一个 `sharedState.ui.components[componentId]`，其 `{ type: "Chart", schemaVersion: 1 }` 且 props 校验通过
- **THEN** UI 能基于快照内容确定性地渲染该 Chart

### Requirement: Chart props 省 token 且可校验
`Chart` props MUST 使用列式/行列式数据形状表达表格数据，以减少重复 key：
- `data.columns: string[]` (non-empty)
- `data.rows: (string | number | null)[][]`

`Chart` props MUST 包含显式 encoding 映射（字段 → 视觉通道），以便智能体生成与服务端校验。

#### Scenario: 行列式 rows 避免每行重复 key
- **WHEN** 图表包含多行数据
- **THEN** 图表 payload 使用 `columns + rows`，不需要每行重复对象 key

### Requirement: Chart 支持最小 mark 集合（v1）
`Chart` props MUST 至少支持以下 `mark` 值：
- `bar`
- `line`
- `pie`

#### Scenario: 渲染受支持的 mark
- **WHEN** `Chart` 以 `mark = "bar"`（或 `"line"`, `"pie"`）挂载，且 data/encoding 校验通过
- **THEN** 组件渲染不崩溃，并展示符合预期的图表类型

### Requirement: Chart 提供基础图表可用性要素
`Chart` 渲染器 MUST 至少提供：
- axes and tick labels for cartesian charts (`bar`/`line`)
- a tooltip on hover/focus that exposes the encoded value
- a legend when a multi-series encoding is present

#### Scenario: Tooltip 暴露编码后的值
- **WHEN** 用户 hover/focus 某个渲染出的 datum（bar/point/slice）
- **THEN** UI 显示包含该 datum 标签与数值的 tooltip

### Requirement: Chart 支持宿主主题（CSS variables）
`Chart` 渲染器 MUST 支持宿主通过 CSS variables 覆盖主题，包括：
- chart palette (at least 4 distinct series colors)
- border/grid/foreground muted colors used by axes and gridlines

#### Scenario: 宿主覆盖图表 palette token
- **WHEN** 宿主应用覆盖图表 palette 的 CSS variable
- **THEN** 渲染出的图表使用被覆盖后的颜色

### Requirement: 空数据时 Chart 必须优雅降级
当 `data.rows` 为空（或不足以渲染指定 `mark`）时，`Chart` 组件 MUST 渲染 viewer-safe 的占位/空态，并且 MUST NOT 导致页面崩溃。

#### Scenario: 空数据展示占位态
- **WHEN** `Chart` 挂载时没有可渲染的 rows
- **THEN** UI 展示空态/占位态，而不是抛异常
