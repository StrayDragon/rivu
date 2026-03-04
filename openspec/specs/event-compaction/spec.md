# event-compaction Specification

## Purpose
Define semantic-preserving event stream compaction/flush rules to reduce storage/replay cost while keeping reducer results equivalent (including chunk-merge and snapshot insertion strategies).
## Requirements
### Requirement: Compaction 后回放归约结果语义等价
系统 MUST 支持对事件流执行 compaction：将一段高频小事件合并为更少的事件（或快照），用于降低写放大与 replay 成本。

对任意给定的输入 envelopes 序列 `E`，compactor 产生的输出序列 `E'` MUST 满足：
- `E'` 的 envelope `seq` MUST 严格递增
- 将 `E` 与 `E'` 分别输入同一个 reducer（TS/Python/Rust）时，在相同 baseline 下得到的派生状态 MUST 语义等价（至少 shared state 与可渲染消息/工具状态等价）

#### Scenario: Reduce 等价（原始流 vs compaction 后）
- **WHEN** 使用相同 reducer 分别归约原始事件流 `E` 与 compaction 后事件流 `E'`
- **THEN** 两者得到的 shared state 与可渲染状态语义等价

### Requirement: Compaction 支持可配置的 flush 触发策略
compactor MUST 支持至少以下三类 flush 触发条件（可组合）：
- 按时间：例如每 `flushIntervalMs` 触发一次
- 按事件数：例如每 `maxBufferedEvents` 触发一次
- 按字节预算：例如累计 `maxBufferedBytes` 触发一次

#### Scenario: 超过事件数阈值触发 flush
- **WHEN** `maxBufferedEvents = 1000` 且累计缓冲事件数超过 1000
- **THEN** compactor 触发一次 flush，并输出一组可持久化的 envelopes

### Requirement: 文本与工具流式事件可被合并为更少事件
compactor MUST 支持对常见写放大来源进行合并，至少包括：
- 同一 `messageId` 的连续文本增量（`TEXT_MESSAGE_CHUNK`）可合并为更少事件
- 同一 `toolCallId` 的连续工具增量（例如 `TOOL_CALL_CHUNK`）可合并为更少事件

合并 MUST 保持最终可见内容等价（内容拼接结果一致），并且 MUST 保持事件间的相对顺序约束（例如不同 `messageId/toolCallId` 的事件相对顺序不被打乱）。

#### Scenario: 合并连续的 TEXT_MESSAGE_CHUNK
- **WHEN** 输入包含同一 `messageId` 的多条连续 `TEXT_MESSAGE_CHUNK`（delta 为 "a","b","c"）
- **THEN** compactor 输出的事件流在回放后得到的最终 message content 等价于 "abc"

### Requirement: UI state 更新的 compaction 允许用快照截断长 patch 链
当连续 `STATE_DELTA` 的 patch 链过长/过大时，compactor MUST 支持通过生成新的 `STATE_SNAPSHOT` 来截断历史，以降低 replay 成本。

#### Scenario: Patch 链超过预算时生成快照
- **WHEN** 自上次快照后累计的 `STATE_DELTA` 数量超过配置预算
- **THEN** compactor 生成新的 `STATE_SNAPSHOT` 并允许丢弃更早的部分增量事件
