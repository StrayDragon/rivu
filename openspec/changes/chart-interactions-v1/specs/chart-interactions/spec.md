## ADDED Requirements

### Requirement: Chart 支持最小交互事件集合（v1）
当 `component.type = "Chart"` 且作为 workflow 组件使用时（包含 server-authoritative `state` 与 `revision`），系统 MUST 支持以下最小交互事件（通过 `CUSTOM(name="ui.v1.event")` 回传）：
- `eventName = "chart.setSelection"`
- `eventName = "chart.clearSelection"`

#### Scenario: Click selects a point
- **WHEN** 用户在图表上点击某个 datum（点/柱/切片）
- **THEN** 前端发送 `ui.v1.event` 且 `eventName="chart.setSelection"`，并在 payload 中携带轻量 selection 引用（不重复原始数据）

### Requirement: `chart.setSelection` payload 是 token-efficient 的 selection 引用
当 `eventName="chart.setSelection"` 时，`payload` MUST 为 object，且 MUST 包含：
- `selection`: object

`payload.selection.kind` MUST 为以下之一：
- `"none"`
- `"point"`（按行索引选择）
- `"range"`（按某列范围选择）
- `"series"`（按系列选择）

当 `kind="point"` 时，`payload.selection` MUST 包含：
- `rowIndex`: non-negative integer

当 `kind="range"` 时，`payload.selection` MUST 包含：
- `column`: non-empty string
- `from`: string | number | null
- `to`: string | number | null

当 `kind="series"` 时，`payload.selection` MUST 包含：
- `value`: string | number

#### Scenario: Payload does not duplicate dataset rows
- **WHEN** 用户点选一个 datum
- **THEN** payload 仅包含 `rowIndex`（以及必要的列/范围），不包含整行 datum JSON

### Requirement: Selection state 是 server-authoritative 且可回放
当启用 chart 交互时，服务端 MUST 将 selection 写入 `sharedState.ui.components[componentId].state.selection`（并递增 `revision`），以保证回放一致性。

`state.selection` 的形状 MUST 与 `chart.setSelection` payload 中的 selection 形状一致。

#### Scenario: Server delta updates selection and revision
- **WHEN** 服务端接受一次 `chart.setSelection` 交互
- **THEN** 服务端发送 `STATE_DELTA` 更新 `component.state.selection` 且递增 `component.revision`

### Requirement: `chart.clearSelection` 清空 selection
当 `eventName="chart.clearSelection"` 时，服务端 MUST 将 `state.selection.kind` 设置为 `"none"`（或等价地移除 selection），并递增 `revision`。

#### Scenario: Clear selection resets highlight
- **WHEN** 用户触发清空选择
- **THEN** UI 在回放到最新 state 后不再高亮任何选择

