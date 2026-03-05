# ui-v1-event Specification

## Purpose
Define requirements for `CUSTOM(name="ui.v1.event")` interactions and the shape of renderable UI state stored under the shared state (`state.ui` / `sharedState.ui`).
## Requirements
### Requirement: UI interactions use `CUSTOM(name="ui.v1.event")`
The system MUST represent client→server UI interactions as an AG-UI `CUSTOM` event with `name` exactly equal to `ui.v1.event`.

The event MUST include a `value` object with the following required fields:
- `componentId`: non-empty string
- `eventName`: non-empty string
- `payload`: JSON object (MUST NOT be an array at the root)
- `clientRequestId`: non-empty string (used for idempotency)
- `baseRevision`: non-negative integer (used for optimistic concurrency)

The system MUST reject `ui.v1.event` messages that fail schema validation.

#### Scenario: Accept a valid `ui.v1.event`
- **WHEN** a client sends a `CUSTOM` event with `name="ui.v1.event"` whose `value` matches the required fields and types
- **THEN** the SDK validators accept the event and can decode it into typed structures

#### Scenario: Reject missing `clientRequestId`
- **WHEN** a client sends a `ui.v1.event` whose `value.clientRequestId` is missing or empty
- **THEN** the SDK validators reject the event as invalid

### Requirement: UI state is stored under `state.ui` (v1)
系统 MUST 将可渲染的 UI 组件数据存放在 AG-UI shared state 的顶层 key `ui` 下（即 `sharedState.ui`）。

`sharedState.ui` MUST 是一个对象，包含：
- `v`: integer equal to `1`
- `components`: an object map keyed by `componentId`

`sharedState.ui` MAY 额外包含：
- `datasets`: an object map keyed by `datasetId`（见 `ui-datasets` spec，用于表格/图表等组件的 `dataRef` 引用）

每个 `sharedState.ui.components[componentId]` 条目 MUST 包含：
- `type`: non-empty string (component type identifier)
- `schemaVersion`: positive integer
- `props`: JSON object
- `revision`: non-negative integer
- `mounts`: array of mount objects

每个 mount 对象 MUST 包含：
- `messageId`: non-empty string
- `slot`: non-empty string
- `order`: number

如果组件是 stateful，它 MUST 还包含：
- `state`: JSON object (server-authoritative persisted state)

如果组件是 stateless，则 `state` 字段 MAY 省略。

#### Scenario: `STATE_SNAPSHOT` can fully restore UI
- **WHEN** 收到一个 `STATE_SNAPSHOT`，其 `snapshot` 包含合法的 `ui` 对象（包含 `components`，并可选包含 `datasets`）
- **THEN** 使用方可以从 `sharedState.ui` 还原完整 UI（包含组件 mounts，以及组件所引用的数据集）

### Requirement: Revisions support optimistic concurrency
对于任何 stateful 组件，服务端 MUST 将 `sharedState.ui.components[componentId].revision` 视为权威 revision。

对于任何意图修改 server-authoritative 组件状态的 `ui.v1.event`，服务端 MUST 将 `baseRevision` 与当前 `revision` 进行比较，并且在不一致时 MUST NOT 应用该变更。

#### Scenario: Accept matching `baseRevision`
- **WHEN** 处理 `ui.v1.event` 时 `baseRevision` 等于当前组件的 `revision`
- **THEN** 服务端可以接受并应用该变更，并发送反映新 `revision` 的 `STATE_DELTA` 或 `STATE_SNAPSHOT`

#### Scenario: Reject conflicting `baseRevision`
- **WHEN** 处理 `ui.v1.event` 时 `baseRevision` 不等于当前组件的 `revision`
- **THEN** 服务端拒绝该变更，客户端可通过 replay 或 `STATE_SNAPSHOT` 重同步

### Requirement: `ui.v1.event` inputs are treated as untrusted
SDK validators MUST support configurable limits for decoding `ui.v1.event` payloads (including maximum bytes and maximum nesting depth).

When a received `ui.v1.event` exceeds configured limits, the SDK MUST reject it.

#### Scenario: Reject oversized payload
- **WHEN** a `ui.v1.event` payload exceeds the configured maximum size
- **THEN** the SDK rejects the event before it reaches business logic

### Requirement: Golden vectors exist for `ui.v1.event` and `state.ui`
The spec package MUST provide golden vectors that include:
- valid `ui.v1.event` examples
- invalid `ui.v1.event` examples
- valid `state.ui` snapshots

The vectors MUST be consumable by TypeScript, Python, and Rust test suites.

#### Scenario: Cross-language validation matches vectors
- **WHEN** each language implementation validates the golden vector inputs
- **THEN** they all agree on which vectors are valid vs invalid

### Requirement: `ui.v1.event` 校验器支持结构规模 limits
SDK validators MUST 支持按 `security-limits-policy` 中定义的 `UiInputLimitsV1` 对 `CUSTOM(name="ui.v1.event")` 做限额校验。

至少，validators MUST 支持：
- `decode.maxBytes` / `decode.maxDepth` / `decode.maxStringLength`（用于整条事件 JSON）
- `uiEvent.maxPayloadKeys`（用于 `value.payload` 顶层 key 数量）

当任一 limits 被触发时，validators MUST 拒绝该事件，并返回 `LIMIT_EXCEEDED` 结构化错误。

#### Scenario: Reject payload with too many keys
- **WHEN** `uiEvent.maxPayloadKeys = 2` 且 `ui.v1.event.value.payload` 顶层包含 3 个 key
- **THEN** validators 拒绝该事件并返回 `LIMIT_EXCEEDED`（`limit="uiEvent.maxPayloadKeys"`）

### Requirement: UI 组件条目可携带 lifecycle 字段且可回放
系统 MUST 允许 `sharedState.ui.components[componentId]` 条目额外包含 lifecycle 字段（见 `ui-component-lifecycle`）：
- `status`
- `error`

这些字段 MUST 能被 `STATE_SNAPSHOT/STATE_DELTA` 回放恢复（属于 shared state 的一部分）。

#### Scenario: Snapshot restores component status
- **WHEN** `STATE_SNAPSHOT.snapshot.ui.components[componentId].status = "building"`
- **THEN** consumer 在重建 UI 时能读取到该 `status` 并进入对应渲染分支

### Requirement: Chart 交互 eventName/payload 必须可校验
当 `ui.v1.event` 作用于 `component.type="Chart"`（workflow）时，系统 MUST 对 `eventName/payload` 做严格校验，并拒绝不符合 `chart-interactions` 规范的输入。

#### Scenario: Reject invalid chart selection payload
- **WHEN** `eventName="chart.setSelection"` 但 `payload.selection` 缺失或类型不合法
- **THEN** SDK validators/processor 拒绝该事件，不进入业务逻辑

