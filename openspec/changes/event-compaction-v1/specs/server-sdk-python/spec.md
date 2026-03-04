## ADDED Requirements

### Requirement: Python SDK 提供 EventCompactor 接口与默认实现
Python SDK MUST 提供一个可替换的 event compaction 组件（例如 `EventCompactor`），用于把高频小事件合并为更少事件或快照，并与 EventStore/SnapshotStore 协作。

默认实现 MUST 至少支持：
- 合并同一 `messageId` 的连续文本增量（`TEXT_MESSAGE_CHUNK`）
- 合并同一 `toolCallId` 的连续工具增量（`TOOL_CALL_CHUNK`）
- 在超过 replay 预算时触发快照写入并截断历史（与 `maxReplayEvents` 等策略协同）

#### Scenario: Compactor 输出可持久化事件序列
- **WHEN** compactor 接收一段流式事件并触发 flush
- **THEN** SDK 输出一组满足 `seq` 递增且可直接写入 EventStore 的 envelopes
