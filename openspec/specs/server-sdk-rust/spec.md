# server-sdk-rust Specification

## Purpose
Define requirements for the official Rust server SDK: decoding/validating events, allocating `seq`, supporting resume/replay and snapshot fallback, and processing `ui.v1.event` with idempotency and optimistic concurrency.
## Requirements
### Requirement: Rust SDK validates and encodes AG-UI events and `ui.v1.event`
The Rust SDK MUST provide strict encode/decode/validate utilities for:
- AG-UI core events
- `CUSTOM(name="ui.v1.event")`

#### Scenario: Decode rejects invalid custom payload
- **WHEN** a Rust service receives an invalid `ui.v1.event`
- **THEN** the SDK rejects it before business logic runs

### Requirement: Rust SDK provides `seq` allocation and resume utilities
The Rust SDK MUST provide utilities to:
- allocate monotonically increasing `seq` values for a thread stream
- serve replay starting from `resumeFrom`
- fall back to snapshot-based resynchronization when replay is incomplete

#### Scenario: Serve resume replay window
- **WHEN** a client reconnects with `resumeFrom=100` and the event store has `seq=101..120`
- **THEN** the SDK returns `seq=101..120` in order

### Requirement: Rust SDK ships default no-external-service stores
The Rust SDK MUST include default storage implementations that require no external services:
- an in-memory ring-buffer EventStore
- a SQLite-based (or file-based) SnapshotStore

#### Scenario: Restore after process restart
- **WHEN** the process restarts and the in-memory store is empty
- **THEN** the SDK can still restore state from the latest SQLite/file snapshot

### Requirement: Rust SDK supports idempotency and revision conflict handling
The Rust SDK MUST provide helper utilities for:
- idempotency using `clientRequestId`
- optimistic concurrency using `baseRevision` and component `revision`

#### Scenario: Idempotent retry does not duplicate effects
- **WHEN** the same `clientRequestId` is processed twice
- **THEN** the SDK returns the original result without reapplying mutations

### Requirement: Rust SDK 提供 `sharedState.ui` JSON Patch builder helpers
Rust SDK MUST 提供 helper utilities，用于为常见的 `sharedState.ui` 变更构造 RFC 6902 JSON Patch 操作，而不要求调用方手写 patch JSON。

至少，helpers MUST 覆盖：
- 将组件 mount/unmount 到 message slot
- replace/set 组件 props
- replace/set 组件 state（仅对 stateful 组件）
- 递增组件 `revision`

#### Scenario: 不手写 JSON 构建 mount patch
- **WHEN** 服务需要把一个已存在的组件 mount 到 `sharedState.ui.components[componentId].mounts`
- **THEN** 它可以调用 SDK helper 生成 targeting `/ui/components/<componentId>/mounts` 的 patch operations

### Requirement: Rust SDK 以统一 limits 结构解码与校验输入
Rust SDK MUST 支持以 `UiInputLimitsV1`（见 `security-limits-policy`）作为统一入参，对以下输入进行 decode/validate：
- `CUSTOM(name="ui.v1.event")`
- `sharedState`（至少包含 `sharedState.ui`）
- JSON Patch ops（用于生成/接收 `STATE_DELTA`）

当检测到 limits 超限时，SDK MUST 返回结构化的 `LIMIT_EXCEEDED` 错误（至少包含 `limit/max/observed`）。

#### Scenario: Decode rejects payload with too many keys
- **WHEN** `uiEvent.maxPayloadKeys = 1` 且 `ui.v1.event.value.payload` 顶层包含多个 key
- **THEN** SDK 拒绝该事件并返回 `LIMIT_EXCEEDED`

### Requirement: Rust SDK 的 patch builder 支持 ops/path 边界
Rust SDK MUST 提供工具函数，用于在构建 `STATE_DELTA` 时强制执行 `jsonPatch` limits（至少 `maxOps` 与 `allowedPathPrefixes`）。

#### Scenario: Patch builder rejects too many ops
- **WHEN** `jsonPatch.maxOps = 5` 且调用方尝试构建 6 个 patch ops
- **THEN** SDK 拒绝并返回 `LIMIT_EXCEEDED`

### Requirement: Rust SDK provides dataset patch helpers
Rust SDK MUST 提供 helpers 用于构建 datasets 相关的 JSON Patch（RFC 6902）操作（targeting `/ui/datasets/...`），至少覆盖：
- create/replace dataset
- delete dataset
- 校验 `dataRef.datasetId` 的基本合法性（non-empty）

#### Scenario: Build a dataset replace patch
- **WHEN** 服务需要写入/更新 `sharedState.ui.datasets[datasetId]`
- **THEN** 可以调用 SDK helper 生成 targeting `/ui/datasets/<datasetId>` 的 patch operations

### Requirement: Rust SDK 解码并校验 `a2ui.v1`
Rust SDK MUST 为 `a2ui.v1` payloads 提供严格的 decode/validate utilities，并支持可配置 limits。

#### Scenario: Decode 拒绝非法 A2UI
- **WHEN** Rust 服务收到非法的 `a2ui.v1` payload
- **THEN** SDK 在进入业务逻辑之前拒绝它

### Requirement: Rust SDK 将 `a2ui.v1` 编译为 `sharedState.ui` patch ops
Rust SDK MUST 提供编译器，将 `a2ui.v1` payloads 转换为 RFC 6902 JSON Patch operations，用于发出变更 `sharedState.ui` 的 `STATE_DELTA`。

编译器 MUST 支持通过 `key -> componentId` 映射实现稳定 identity。

#### Scenario: 编译 create + mount 为 patch ops
- **WHEN** payload 创建组件并将其挂载到某个 message slot
- **THEN** 编译器返回用于创建组件条目并添加 mount 的 patch ops

### Requirement: Rust SDK 解码与校验 `ui.v1.capabilities`
Rust SDK MUST 提供 strict encode/decode/validate utilities for `CUSTOM(name="ui.v1.capabilities")`。

#### Scenario: Reject missing required fields
- **WHEN** capabilities payload 缺失 `v` 或 `components`
- **THEN** SDK validators 拒绝该 payload

### Requirement: Rust SDK 提供组件兼容性判断与降级选择 helper
Rust SDK MUST 提供 helper utilities，用于：
- 判断某个 `(componentType, schemaVersion)` 是否被客户端 capabilities 支持
- 在一组候选组件（类型/版本）中选择最兼容的一个（或返回 “无可用”）

#### Scenario: Choose the highest supported schemaVersion
- **WHEN** 客户端对 `MetricCard` 支持 `minSchemaVersion=1,maxSchemaVersion=2` 且候选包含 `MetricCard@1` 与 `MetricCard@2`
- **THEN** helper 选择 `MetricCard@2`

### Requirement: Rust SDK 提供 EventCompactor 接口与默认实现
Rust SDK MUST 提供一个可替换的 event compaction 组件（例如 `EventCompactor`），用于把高频小事件合并为更少事件或快照，并与 EventStore/SnapshotStore 协作。

默认实现 MUST 至少支持：
- 合并同一 `messageId` 的连续文本增量（`TEXT_MESSAGE_CHUNK`）
- 合并同一 `toolCallId` 的连续工具增量（`TOOL_CALL_CHUNK`）
- 在超过 replay 预算时触发快照写入并截断历史（与 `maxReplayEvents` 等策略协同）

#### Scenario: Compactor 不破坏 reduce 结果
- **WHEN** 对同一输入事件流分别执行“原样 reduce”与“compaction 后 reduce”
- **THEN** 两者得到的 shared state 语义等价

