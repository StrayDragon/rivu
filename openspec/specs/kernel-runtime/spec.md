# kernel-runtime Specification

## Purpose
Define requirements for the framework-agnostic Rivu kernel runtime: dispatching `{seq,event}` envelopes, maintaining derived state (including shared state), and exposing resync metadata and an action outbox.
## Requirements
### Requirement: Kernel exposes a framework-agnostic core API
kernel MUST 可在不依赖 React/Svelte/Vue 等框架特定依赖的情况下使用。

至少，kernel MUST 暴露：
- `dispatch(envelope)`: 应用一条服务端 envelope `{ seq, event }`
- `getState()`: 读取当前派生状态（包含 `sharedState.ui`）
- `subscribe(listener)`: 订阅状态变化并返回 unsubscribe 函数
- `send(action)`: 通过注入的 transport 发送客户端 action（例如 `ui.v1.event`）

kernel MUST NOT 直接发起网络请求。

#### Scenario: Subscriptions observe state changes
- **WHEN** 使用方调用 `subscribe(listener)`，随后调用 `dispatch(...)` 应用一条 envelope
- **THEN** 状态更新后会调用 listener

### Requirement: Kernel enforces `seq` ordering semantics
The kernel MUST maintain a `lastSeq` counter in its internal state.

When `dispatch(envelope)` is called:
- If `envelope.seq == lastSeq + 1`, the kernel MUST validate and apply the event.
- If `envelope.seq <= lastSeq`, the kernel MUST discard the envelope without mutating state.
- If `envelope.seq > lastSeq + 1`, the kernel MUST signal a gap and MUST NOT apply the envelope.

#### Scenario: Kernel discards old envelopes
- **WHEN** the kernel has `lastSeq = 10` and receives `dispatch({ seq: 9, event })`
- **THEN** the kernel discards the envelope and `getState().lastSeq` remains `10`

#### Scenario: Kernel signals gap
- **WHEN** the kernel has `lastSeq = 10` and receives `dispatch({ seq: 12, event })`
- **THEN** the kernel signals a gap and does not mutate state

### Requirement: Kernel validates inbound events and rejects unknown UI custom names by default
The kernel MUST perform runtime schema validation for inbound AG-UI events.

For `CUSTOM` events, the kernel MUST reject unknown `name` values by default.

#### Scenario: Reject invalid `ui.v1.event`
- **WHEN** the kernel receives a `CUSTOM(name="ui.v1.event")` whose `value` fails validation
- **THEN** the kernel rejects the event and does not mutate state

#### Scenario: Reject unknown custom event
- **WHEN** the kernel receives a `CUSTOM` event with `name="ui.unknown.event"`
- **THEN** the kernel rejects the event by default

### Requirement: Kernel applies AG-UI state events to maintain shared state
kernel MUST 维护一个 shared state 对象（`sharedState`），并通过 AG-UI state events 更新：
- 对于 `STATE_SNAPSHOT`，kernel MUST 用 `snapshot` 全量替换 shared state
- 对于 `STATE_DELTA`，kernel MUST 将 `delta` 作为 JSON Patch（RFC 6902）应用到当前 shared state

如果应用 `STATE_DELTA` 失败，kernel MUST 进入需要重同步的状态，并且 SHOULD 请求新的 `STATE_SNAPSHOT`。

#### Scenario: Snapshot replaces state
- **WHEN** kernel 收到 `STATE_SNAPSHOT`，且 `snapshot` 包含 `ui`
- **THEN** `getState().sharedState.ui` 等于该 snapshot 的 `ui` 值

#### Scenario: Delta patches state
- **WHEN** kernel 收到 `STATE_DELTA`，其 JSON Patch 操作修改 `/ui/components/cmp_1/props`
- **THEN** kernel 相应更新 `sharedState.ui.components.cmp_1.props`

### Requirement: Kernel outbox enforces idempotent action sending
The kernel MUST require `clientRequestId` for user-generated actions (including `ui.v1.event`) and MUST support deduplication of actions by `clientRequestId`.

The kernel MUST NOT mutate server-authoritative state in response to `send(action)` unless corresponding server envelopes are later applied via `dispatch`.

#### Scenario: Deduplicate duplicate sends
- **WHEN** `send(action)` is called twice with the same `clientRequestId`
- **THEN** the kernel sends at most one transport request and treats the second as a duplicate

### Requirement: Kernel exposes resynchronization metadata for gaps and patch errors
kernel MUST 在其 state 中暴露重同步相关的元数据，以便集成层处理与调试。

至少，kernel state MUST 包含：
- `needsResync`: boolean
- `resyncReason`: `"gap" | "patch_error" | null`

当检测到 gap（`seq > lastSeq + 1`）时，kernel MUST：
- 设置 `needsResync = true`
- 设置 `resyncReason = "gap"`
- 暴露 gap 元数据，包括 `expectedSeq` 与 `gotSeq`

当应用 `STATE_DELTA` 发生 patch error 时，kernel MUST：
- 设置 `needsResync = true`
- 设置 `resyncReason = "patch_error"`

#### Scenario: Gap metadata is visible
- **WHEN** kernel 的 `lastSeq = 10` 且收到 `dispatch({ seq: 12, event })`
- **THEN** `getState().needsResync` 为 `true`，并且 state 暴露 `expectedSeq = 11` 与 `gotSeq = 12`

#### Scenario: Patch error metadata is visible
- **WHEN** kernel 无法应用一个非法的 `STATE_DELTA` patch
- **THEN** `getState().needsResync` 为 `true` 且 `getState().resyncReason` 为 `"patch_error"`

### Requirement: Kernel 对 `STATE_SNAPSHOT/STATE_DELTA` 执行防御性 limits
kernel MUST 在应用 `STATE_SNAPSHOT/STATE_DELTA` 之前，对输入执行防御性 limits 校验（即使服务端已校验）。

至少，kernel MUST 支持：
- `uiState.maxComponents`：限制 `sharedState.ui.components` 的条目数量
- `jsonPatch.maxOps`：限制 `STATE_DELTA.delta` 的 ops 数量
- `jsonPatch.allowedPathPrefixes`：限制 patch op 的 `path` 只能落在允许的 JSON Pointer 前缀集合内（默认 SHOULD 包含 `"/ui"`）

当检测到 limits 超限时，kernel MUST：
- 拒绝该 envelope（不应用到 `sharedState`）
- 不推进 `lastSeq`
- 设置 `needsResync = true`
- 设置 `resyncReason = "limit_exceeded"`
- 暴露结构化诊断信息（至少 `limit/max/observed`）

#### Scenario: Reject delta with too many patch ops
- **WHEN** `jsonPatch.maxOps = 10` 且收到 `STATE_DELTA` 的 `delta.length = 11`
- **THEN** kernel 拒绝该 envelope，不推进 `lastSeq`，并进入 `needsResync/resyncReason="limit_exceeded"`

#### Scenario: Reject delta that patches disallowed paths
- **WHEN** `jsonPatch.allowedPathPrefixes = ["/ui"]` 且某个 patch op 的 `path="/messages/0/content"`
- **THEN** kernel 拒绝该 envelope，并暴露 `LIMIT_EXCEEDED`（或等价的“被策略拒绝”诊断信息）

