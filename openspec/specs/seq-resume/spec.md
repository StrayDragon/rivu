# seq-resume Specification

## Purpose
Define requirements for `seq` ordering and `resumeFrom`-based resume semantics across transports (SSE and WebSocket wrappers).
## Requirements
### Requirement: Every streamed event MUST have a monotonically increasing `seq`
For any transport used between server and client (SSE or WebSocket wrapper), each delivered unit MUST carry a `seq` value that is a positive integer and is monotonically increasing for a given stream.

#### Scenario: Apply contiguous sequence
- **WHEN** a client receives envelopes with `seq` values `N, N+1, N+2` in order
- **THEN** the client applies all events in the same order and advances its `lastSeq` to `N+2`

### Requirement: Resume uses `resumeFrom` as the last applied `seq`
Clients MUST attempt to resume a disconnected stream by providing `resumeFrom` equal to the last successfully applied `seq`.

Servers MUST support resuming by sending events with `seq > resumeFrom` in increasing order, or by resynchronizing the client using a `STATE_SNAPSHOT` when replay is not possible.

#### Scenario: Resume via replay
- **WHEN** a client reconnects with `resumeFrom = lastSeq`
- **THEN** the server replays all available envelopes with `seq > resumeFrom` in increasing order

#### Scenario: Resume via snapshot fallback
- **WHEN** a client reconnects with `resumeFrom = lastSeq` but the server cannot provide contiguous replay from that point
- **THEN** the server sends a `STATE_SNAPSHOT` that reestablishes a correct baseline state before continuing with further events

### Requirement: Duplicate and out-of-order sequences MUST NOT be applied
A client MUST NOT apply any envelope whose `seq` is less than or equal to the last applied `seq`.

#### Scenario: Discard duplicates
- **WHEN** a client has applied `lastSeq = 100` and receives an envelope with `seq = 100`
- **THEN** the client discards the envelope without changing state

### Requirement: Gaps trigger resynchronization
A client MUST detect a gap when receiving an envelope with `seq > lastSeq + 1`.

When a gap is detected, the client MUST NOT apply the out-of-order envelope and MUST trigger a resynchronization procedure (replay request and/or `STATE_SNAPSHOT`).

#### Scenario: Gap detection
- **WHEN** a client has applied `lastSeq = 100` and receives an envelope with `seq = 102`
- **THEN** the client detects a gap and triggers resynchronization instead of applying `seq = 102`

### Requirement: 因 compaction 导致 replay 不完整时必须 snapshot 兜底
当服务端因 compaction/裁剪导致无法从 `resumeFrom` 提供连续 replay 时，服务端 MUST 使用 `STATE_SNAPSHOT` 进行兜底重同步，并在其后继续发送 `seq` 递增的事件。

服务端 MUST NOT 发送任何 `seq <= resumeFrom` 的 envelope。

#### Scenario: ResumeFrom 落在被裁剪区间时发送快照
- **WHEN** 客户端以 `resumeFrom = 50` 重连，但服务端已裁剪掉 `seq=51..99`
- **THEN** 服务端发送一个 `seq > 50` 的 `STATE_SNAPSHOT` 以重建基线，并继续发送后续 `seq` 递增事件

