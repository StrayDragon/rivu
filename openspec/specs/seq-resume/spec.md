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
