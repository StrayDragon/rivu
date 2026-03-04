## ADDED Requirements

### Requirement: Rust SDK 提供 EventCompactor 接口与默认实现
Rust SDK MUST 提供一个可替换的 event compaction 组件（例如 `EventCompactor`），用于把高频小事件合并为更少事件或快照，并与 EventStore/SnapshotStore 协作。

默认实现 MUST 至少支持：
- 合并同一 `messageId` 的连续文本增量（`TEXT_MESSAGE_CHUNK`）
- 合并同一 `toolCallId` 的连续工具增量（`TOOL_CALL_CHUNK`）
- 在超过 replay 预算时触发快照写入并截断历史（与 `maxReplayEvents` 等策略协同）

#### Scenario: Compactor 不破坏 reduce 结果
- **WHEN** 对同一输入事件流分别执行“原样 reduce”与“compaction 后 reduce”
- **THEN** 两者得到的 shared state 语义等价
