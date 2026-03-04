## ADDED Requirements

### Requirement: 客户端通过 `CUSTOM(name="ui.v1.capabilities")` 上报能力
系统 MUST 支持客户端→服务端发送一个 AG-UI `CUSTOM` 事件，且：
- `name` MUST 等于 `ui.v1.capabilities`
- `value` MUST 是一个 JSON object（root MUST NOT be array）

`value` MUST 至少包含：
- `v`: integer，值为 `1`
- `components`: object map（key 为 `componentType`，value 描述支持的 `schemaVersion`）

每个 `components[componentType]` MUST 至少包含：
- `minSchemaVersion`: positive integer
- `maxSchemaVersion`: positive integer（且 MUST >= minSchemaVersion）

`value` MAY 包含：
- `features`: object（用于声明关键特性开关；见下方 `features` 要求）
- `client`: object（例如 framework/runtime 版本信息，用于日志诊断）

#### Scenario: Accept a valid capabilities payload
- **WHEN** 客户端发送 `CUSTOM(name="ui.v1.capabilities")` 且 `value` 满足以上字段与类型约束
- **THEN** SDK validators 接受该事件并可解码为类型化结构

### Requirement: 服务端使用 capabilities 做选择/降级，但不能作为安全边界
服务端 MUST 能使用 capabilities 来选择更兼容的组件输出（类型/版本/feature 分支），以减少 `UnknownComponentCard` 的发生。

服务端 MUST 将 capabilities 视为不可信 hint（可缺失/过期/不一致），并且 MUST 保持在 capabilities 缺失时仍可工作（采用保守输出 + 客户端 Unknown 降级兜底）。

#### Scenario: Missing capabilities falls back to conservative output
- **WHEN** 服务端未收到客户端的 capabilities
- **THEN** 服务端仍能输出可回放 UI（必要时使用更保守/更通用的组件或降级路径）

### Requirement: `features` 的推荐 key 与语义（v1）
当 `value.features` 存在时，它 MUST 是一个 JSON object，并且 SHOULD 使用以下 key（未知 key MUST 被忽略）：

- `datasets`: boolean —— 是否支持 `sharedState.ui.datasets` 与组件 `dataRef` 引用
- `lifecycle`: boolean —— 是否支持组件 lifecycle 字段（例如 `status="building|ready|error"` 与 `error`）
- `chart`: object（可选；当客户端支持 `Chart` 时建议提供）
  - `marks`: string[] —— 支持的 `Chart` mark 值（例如 `"bar"|"line"|"pie"`）
  - `interactions`: string[] —— 支持的图表交互事件名（例如 `"chart.setSelection"`, `"chart.clearSelection"`）
- `export`: object（可选）
  - `formats`: string[] —— 支持的导出格式（例如 `"json"|"html"|"svg"|"pdf"`）

#### Scenario: Features drives server-side downgrade choices
- **WHEN** `features.datasets = false`
- **THEN** 服务端在输出 `DataTable/Chart` 数据时采用更保守的兼容路径（例如内联数据而不是 `dataRef`）
