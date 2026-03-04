# OpenSpec Changes（推荐顺序）

本目录包含各个变更（change）的 proposal / design / specs / tasks 工件。

## 推荐实现顺序

1) `integration-ergonomics-v1`
   - 先把集成 DX 打底：统一 docs/examples 的事件写法、明确 `sharedState.ui` 口径、提供 `ProtocolInspector`、并补齐 server SDK patch helpers。
   - 在扩大 UI surface area 之前先降低集成踩坑率。

2) `security-limits-policy-v1`
   - 把所有不可信输入（`ui.v1.event` / `sharedState.ui` / JSON Patch / datasets / A2UI）用统一 limits/policy 框住，避免 UI 爆炸与 DoS。
   - 建议在引入更大 surface area（A2UI/datasets/export/交互）之前先落地。

3) `ui-theme-tokens-slots`
   - 让 UI kit 真正“像水”：theme tokens（CSS variables + fallback）、`className/style` 覆盖、复杂组件 slots/render hooks。
   - 为图表与导出提供一致的视觉基础（palette/border/grid/typography）。

4) `ui-component-lifecycle-v1`
   - 标准化组件生命周期（`building|ready|error`）与 skeleton/error 渲染分支，提升流式生成 UI 的直觉与可调试性。

5) `ui-datasets-v1`
   - 引入 `sharedState.ui.datasets` + `dataRef` 引用，减少 DataTable/Chart 等组件重复数据与 patch/token 体积。

6) `a2ui-viz-chart-v1`
   - 增加通用 Viewer `Chart` 组件 + 省 token 的图表描述 + D3 驱动的专业渲染。
   - 可与 `ui-datasets-v1` 协同：Chart/DataTable 共享同一数据集。

7) `a2ui-bridge-v1`
   - 定义紧凑的 `a2ui.v1`（面向 LLM 输出）并在服务端编译为 `STATE_DELTA`（RFC6902 patch）更新 `sharedState.ui`。
   - 把“UI 长什么样”从回放真值 `sharedState.ui` 中抽离为更省 token 的生成输入。

8) `component-capabilities-handshake-v1`
   - 客户端上报“支持哪些组件/版本/特性”，服务端据此选择/降级输出，减少 UnknownComponent 并提升兼容性。

9) `viewer-export-html-svg-pdf`
   - Viewer 导出能力：在 structured JSON snapshot 基础上，扩展 HTML/SVG/PDF 导出路径（图表优先 SVG）。

10) `event-compaction-v1`
   - server-side flush/compaction：把高频小事件合并，降低写放大与 replay 成本；与快照策略协同。

11) `chart-interactions-v1`
   - 在保持 viewer Chart 不受影响的前提下，为 workflow 引入最小图表交互闭环（select/clear → `ui.v1.event` → server patch → 高亮回放）。

## 如何开始实现某个 change

运行：

- `/opsx:apply <change-name>`

示例：

- `/opsx:apply integration-ergonomics-v1`
