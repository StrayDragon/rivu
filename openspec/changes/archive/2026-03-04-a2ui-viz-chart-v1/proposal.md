## Why

当前 `BarChart/LineChart` 仅是“示意级”渲染（缺少坐标轴/刻度/网格/tooltip/legend/响应式等产品级能力），难以在 Crystalith 的 Viewer 报表场景中承担“可信展示”的角色。

与此同时，我们希望把 Rivu 的 `state.ui` 作为 A2UI 的组件描述载体，让智能体用**更省 token 的结构**生成图表 UI，再通过 AG-UI 事件流完成可回放的渲染与导出。

## What Changes

- 新增一个更通用的 Viewer（stateless）图表组件：`Chart`（schemaVersion: 1），覆盖 `bar/line/pie`（v1）并为后续扩展（area/scatter/heatmap）预留结构。
- 定义一套面向 LLM 生成的 **A2UI 图表描述结构**（token-efficient），核心策略：
  - 数据使用 `columns + rows`（列式/行列式）表达，避免重复 key
  - 编码使用显式 `x/y/series/value` 映射，保持可校验与可回放
- React 侧图表渲染引擎从“手写简化 SVG”升级为 **D3（d3-scale / d3-shape / d3-axis 等）驱动的专业 SVG 渲染**，参考 `../tambo` 的 Graph 组件体验（loading/错误边界/响应式/主题色变量），但不复制其源码实现。
- `BarChart/LineChart` 进入兼容层（保留或标记为 deprecated 的 alias 组件），推荐后续统一使用 `Chart`。
- 更新示例与文档：React demo 展示 `Chart`；Integration Guide 增加 A2UI 图表生成提示与最小样例。

## Capabilities

### New Capabilities
- `a2ui-viz-chart`: 定义 `Chart`（Viewer/stateless）组件的 schema、token-efficient 数据表示与渲染约束（v1 覆盖 bar/line/pie）。

### Modified Capabilities
- `ui-components-mvp`: Viewer 组件清单与要求补充/收敛到通用 `Chart`（并描述与 `BarChart/LineChart` 的兼容关系）。
- `react-examples`: React demo 需覆盖并展示 `Chart`（以及必要的兼容展示策略）。

## Impact

- `packages/rivu-react`：新增/调整 Viewer 图表组件与 registry；引入 D3 依赖（需关注 tree-shaking 与 bundle 体积）。
- `packages/rivu-ui-spec`（可选/推荐）：承载 A2UI 图表描述结构的 JSON schema（便于校验与跨语言对齐）。
- `examples/rivu-react-demo`：替换/新增 demo fixtures 展示 `Chart`。
- `docs/`：补充 A2UI 图表生成说明、兼容策略与最佳实践。
