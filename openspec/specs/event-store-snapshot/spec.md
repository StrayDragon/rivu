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

### Requirement: Compaction 与快照策略协同以控制写放大
当启用 compaction 时，系统 MUST 支持在“可 replay 窗口”之外丢弃细粒度历史事件，以控制写放大与回放成本。

当系统准备丢弃某个 `seq` 范围内的细粒度事件时，系统 MUST 确保存在一个可用于重建基线的 `STATE_SNAPSHOT`（其 `seq` 大于等于被丢弃范围的结束位置），以便在 resume 时通过快照兜底。

#### Scenario: 丢弃旧事件前先写入快照
- **WHEN** 系统计划丢弃 `seq <= 1000` 的细粒度事件
- **THEN** SnapshotStore 中存在一个 `seq >= 1000` 的快照用于恢复

### Requirement: Export 可以基于 compaction 后的事件与快照工作
在启用 compaction 的情况下，导出（structured JSON snapshot / HTML/SVG/PDF 等）MUST 仍然可从快照与剩余事件中构建出一致的 Viewer 结果。

#### Scenario: Compaction 不破坏导出一致性
- **WHEN** 系统使用 compaction 后的存储内容执行一次导出
- **THEN** 导出结果仍可被 viewer runtime 确定性渲染（未知组件按降级规则处理）

