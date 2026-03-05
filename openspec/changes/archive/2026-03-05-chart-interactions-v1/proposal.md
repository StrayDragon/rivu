## Why

当前 `Chart`（viewer profile）是 stateless 的：只从 `sharedState.ui` 渲染，不回传交互。这对回放/导出很好，但无法覆盖“分析/工作流”场景常见的交互需求（选择、过滤、brush、legend toggle 等）。如果每个宿主都用自定义 eventName/payload 自己实现，会导致跨项目不可复用、服务端 SDK 难以提供通用支持，也会增加智能体生成与理解的复杂度。

## What Changes

- 为图表定义一组规范化的交互回传（基于 `CUSTOM(name="ui.v1.event")`）：
  - 约束 `eventName` 与 payload 形状（尽量引用 `datasetId` 与 rowIndex 等，避免重复数据，节省 token）
  - 明确 server-authoritative 的选择/过滤 state 形状与 revision 语义
- 在 Python/Rust server SDK 中提供内置处理器：
  - `process_chart_event(...) -> { patchOps, newRevision }`（或等价）用于把交互转成对 `sharedState.ui` 的受控更新
- 在 React/Svelte UI kit 中提供交互渲染与回传示例（不要求所有交互都在 v1 完成，但要闭环）。

## Capabilities

### New Capabilities
- `chart-interactions`: 定义图表交互事件、payload、以及 chart selection/filter 的 state schema。

### Modified Capabilities
- `ui-v1-event`: 增加针对 `Chart` 的标准化 `eventName/payload` 约束与校验要求。
- `server-sdk-python`: 增加 chart 交互处理器与 patch builder 的规范性要求。
- `server-sdk-rust`: 同上。
- `ui-components-mvp`: 增加 “交互型图表” 的最小闭环要求（workflow profile），并保持 viewer Chart 不受影响。
- `react-examples`: demo 增加 chart 交互 round-trip 示例。

## Impact

- `packages/rivu-react` / `packages/rivu-svelte`: `Chart` 组件需要可选交互模式（onSelect/onBrush → `ui.v1.event`），并能渲染当前 selection/filter 状态。
- `python/` 与 `crates/`: 需要新增 chart 交互 processor（校验、并发控制、patch 输出）。
- 文档：补齐 “交互型图表” 的推荐事件与 payload 示例，避免宿主自定义碎片化。
