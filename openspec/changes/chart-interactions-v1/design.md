## Context

`a2ui-viz-chart-v1` 引入了 viewer `Chart`（stateless）组件：从 `sharedState.ui` 渲染，强调可回放与导出。但分析与工作流场景通常需要交互：用户点选某条数据、框选一个时间范围、清除选择等。若没有标准化交互事件与服务端 SDK 支持，宿主只能自定义 eventName/payload，最终导致生态碎片化与重复实现。

本设计在不破坏 viewer Chart 的前提下，引入一组最小且稳定的交互事件，并给出 server-authoritative 的 selection/filter state 形状与 patch 输出方式，使其能闭环：
用户交互 → `ui.v1.event` → server 校验/并发/幂等 → `STATE_DELTA` → 图表高亮/筛选更新。

## Goals / Non-Goals

**Goals:**
- 定义少量（3~5 个以内）的 chart 交互 `eventName` 与 payload schema，强调 token-efficient（尽量用 rowIndex/范围，不重复数据）。
- 定义 chart 的 server-authoritative `state` 最小形状（selection/filter），并明确 revision 语义。
- 在 Python/Rust server SDK 中提供内置 chart event processor，输出受控 JSON Patch。
- 在 UI kit 中提供参考实现：图表交互触发 event，并能渲染当前 selection 状态（高亮/显示标签）。

**Non-Goals:**
- v1 不定义复杂的多组件联动过滤管线（例如自动重写 datasets 或跨组件同步过滤结果）；这些可在后续 changes 迭代。
- v1 不要求所有 mark 类型都支持所有交互（例如 pie 的 brush）；只要求最小闭环。
- v1 不要求服务端执行真实数据查询/聚合；交互 state 更新即可。

## Decisions

### 1) 交互事件仍然复用 `CUSTOM(name="ui.v1.event")`

**Decision:** Chart 交互回传使用现有 `ui.v1.event` 机制（componentId/clientRequestId/baseRevision），仅标准化 `eventName/payload`。  
**Why:** 复用现有幂等与并发控制链路，减少协议分叉。  
**Alternatives:** 新增独立 custom name 会增加端到端实现成本，并且仍需要重复 idempotency/revision 语义。

### 2) Payload 优先引用 rowIndex/范围，而不是重复数据

**Decision:** payload 不携带完整 datum；优先携带 `rowIndex`（点选）或 `{ column, from, to }`（范围选择）等轻量引用。  
**Why:** 节省 token，避免把数据重复塞回事件；服务端可基于组件 props（如 `dataRef`）进行校验。  
**Alternatives:** 传完整 datum 易超限且不稳定（字段多/重复）。

### 3) Chart 可选成为 stateful：selection 存在于 `component.state`

**Decision:** 当启用交互时，`Chart` 作为 workflow 组件使用 server-authoritative `state.selection`（并维护 `revision`）。viewer Chart 仍可不包含 `state`。  
**Why:** 交互结果需要可回放与可审计；并发控制也需要 revision。  
**Alternatives:** 纯客户端本地 selection 无法回放，也无法驱动后端工作流。

## Risks / Trade-offs

- [rowIndex 漂移] datasets 被替换/重排后，旧 rowIndex 可能失效 → 服务端校验 rowIndex 是否在范围内；必要时清空 selection 并返回错误态。
- [交互过多] 标准化 eventName 太多会增加模型与实现复杂度 → v1 控制在最小集合，后续按需扩展。
- [mark 兼容性] 不同 mark 支持的交互不同 → 规范要求最小支持，并允许不支持时 viewer-safe 降级（禁用交互或提示）。
