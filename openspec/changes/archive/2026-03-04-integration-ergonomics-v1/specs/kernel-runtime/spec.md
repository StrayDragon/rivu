## MODIFIED Requirements

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

## ADDED Requirements

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
