# server-sdk-python Specification

## Purpose
Define requirements for the official Python server SDK: decoding/validating events, allocating `seq`, supporting resume/replay and snapshot fallback, and processing `ui.v1.event` with idempotency and optimistic concurrency.
## Requirements
### Requirement: Python SDK validates and encodes AG-UI events and `ui.v1.event`
The Python SDK MUST provide strict encode/decode/validate utilities for:
- AG-UI core events
- `CUSTOM(name="ui.v1.event")`

#### Scenario: Decode rejects invalid custom payload
- **WHEN** a Python service receives an invalid `ui.v1.event`
- **THEN** the SDK rejects it before business logic runs

### Requirement: Python SDK provides `seq` allocation and resume utilities
The Python SDK MUST provide utilities to:
- allocate monotonically increasing `seq` values for a thread stream
- serve replay starting from `resumeFrom`
- fall back to snapshot-based resynchronization when replay is incomplete

#### Scenario: Serve resume replay window
- **WHEN** a client reconnects with `resumeFrom=100` and the event store has `seq=101..120`
- **THEN** the SDK returns `seq=101..120` in order

### Requirement: Python SDK ships default no-external-service stores
The Python SDK MUST include default storage implementations that require no external services:
- an in-memory ring-buffer EventStore
- a SQLite-based (or file-based) SnapshotStore

#### Scenario: Restore after process restart
- **WHEN** the process restarts and the in-memory store is empty
- **THEN** the SDK can still restore state from the latest SQLite/file snapshot

### Requirement: Python SDK supports idempotency and revision conflict handling
The Python SDK MUST provide helper utilities for:
- idempotency using `clientRequestId`
- optimistic concurrency using `baseRevision` and component `revision`

#### Scenario: Idempotent retry does not duplicate effects
- **WHEN** the same `clientRequestId` is processed twice
- **THEN** the SDK returns the original result without reapplying mutations

### Requirement: Python SDK 提供 `sharedState.ui` JSON Patch builder helpers
Python SDK MUST 提供 helper utilities，用于为常见的 `sharedState.ui` 变更构造 RFC 6902 JSON Patch 操作，而不要求调用方手写 patch JSON。

至少，helpers MUST 覆盖：
- 将组件 mount/unmount 到 message slot
- replace/set 组件 props
- replace/set 组件 state（仅对 stateful 组件）
- 递增组件 `revision`

#### Scenario: 不手写 JSON 构建 mount patch
- **WHEN** 服务需要把一个已存在的组件 mount 到 `sharedState.ui.components[componentId].mounts`
- **THEN** 它可以调用 SDK helper 生成 targeting `/ui/components/<componentId>/mounts` 的 patch operations

### Requirement: Python SDK 以统一 limits 结构解码与校验输入
Python SDK MUST 支持以 `UiInputLimitsV1`（见 `security-limits-policy`）作为统一入参，对以下输入进行 decode/validate：
- `CUSTOM(name="ui.v1.event")`
- `sharedState`（至少包含 `sharedState.ui`）
- JSON Patch ops（用于生成/接收 `STATE_DELTA`）

当检测到 limits 超限时，SDK MUST 返回/抛出结构化的 `LIMIT_EXCEEDED` 错误（至少包含 `limit/max/observed`）。

#### Scenario: Decode rejects oversized `ui.v1.event`
- **WHEN** `decode.maxBytes` 被设置，且收到的 `ui.v1.event` JSON 超过该阈值
- **THEN** SDK 在进入业务逻辑前拒绝并返回 `LIMIT_EXCEEDED`

### Requirement: Python SDK 的 patch builder 支持 ops/path 边界
Python SDK MUST 提供工具函数，用于在构建 `STATE_DELTA` 时强制执行 `jsonPatch` limits（至少 `maxOps` 与 `allowedPathPrefixes`）。

#### Scenario: Patch builder rejects disallowed path
- **WHEN** `jsonPatch.allowedPathPrefixes = [\"/ui\"]` 且调用方尝试构建 `path=\"/messages/0\"` 的 patch op
- **THEN** SDK 拒绝该 patch 并返回 `LIMIT_EXCEEDED`（或等价的策略拒绝错误）

