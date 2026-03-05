# event-store-snapshot Specification

## Purpose
Define requirements for server-side event storage and snapshotting needed to support resume/replay and snapshot fallback.
## Requirements
### Requirement: EventStore supports append and replay by `seq`
The system MUST provide an EventStore abstraction that can:
- append envelopes `{ seq, event }` for a given `threadId`
- replay envelopes in increasing `seq` order starting after a given `seq` (`afterSeq`)

#### Scenario: Replay after a resume point
- **WHEN** the EventStore contains events for `threadId=T` with `seq` values `101..110`
- **THEN** replaying with `afterSeq=105` returns `seq` `106..110` in order

### Requirement: In-memory ring-buffer EventStore is available by default
A default in-memory ring-buffer implementation MUST exist with configurable capacity per thread.

When the capacity is exceeded, the implementation MUST evict the oldest envelopes first.

#### Scenario: Evict oldest when capacity exceeded
- **WHEN** a ring-buffer EventStore with capacity `3` appends `seq=1,2,3,4`
- **THEN** replay after `afterSeq=1` does not include `seq=2` if it has been evicted, and the store indicates replay is incomplete

### Requirement: SnapshotStore persists recoverable state without external services
A default SnapshotStore MUST exist that can store and retrieve snapshots for a given `threadId` (and optionally `runId`).

Snapshots MUST be stored in a format that can be used to reconstruct `state.ui` (and other shared state) after refresh/restart without requiring external services.

#### Scenario: Restore from latest snapshot
- **WHEN** the SnapshotStore contains a snapshot for `threadId=T` at `seq=S`
- **THEN** a consumer can load the snapshot and resume replay from `seq=S`

### Requirement: Snapshot policy bounds replay cost
The system MUST support a snapshot policy that can trigger snapshot creation based on a configured replay budget (e.g., `maxReplayEvents`).

#### Scenario: Create snapshot after budget exceeded
- **WHEN** the number of events since the last snapshot exceeds the configured replay budget
- **THEN** the system creates a new snapshot and resets the budget counter

### Requirement: Export produces a stable JSON snapshot for Viewer use-cases
系统 MUST 支持导出“结构化 JSON snapshot”，其至少包含：
- 用于查看的 messages 与 tool results
- shared state（包含 `sharedState.ui`）

该 JSON snapshot MUST 可用于确定性回放 Viewer UI，并作为进一步导出格式（HTML/SVG/PDF）的输入。

#### Scenario: Export can be re-rendered consistently
- **WHEN** 一个导出的 JSON snapshot 被导入到 viewer runtime
- **THEN** viewer 能确定性渲染 `sharedState.ui`，未知组件降级且页面保持可用

