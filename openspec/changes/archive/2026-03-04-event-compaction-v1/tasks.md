## 1. 向量与一致性测试

- [x] 1.1 在 `packages/rivu-ui-spec` 增加 compaction golden vectors（原始事件流 + 期望等价约束）
- [x] 1.2 为 TS/Python/Rust 增加“compaction 后 reduce 等价”的测试 harness
- [x] 1.3 增加覆盖：文本 chunk 合并、tool chunk 合并、长 patch 链触发快照

## 2. Rust SDK：EventCompactor

- [x] 2.1 定义 `EventCompactor` 接口（push/flush/metrics）与默认实现
- [x] 2.2 实现 `*_CHUNK` 文本/工具事件合并规则（保持拼接顺序；不同 `messageId/toolCallId` 不串扰）
- [x] 2.3 实现与 `maxReplayEvents` 协同的快照化截断策略
- [x] 2.4 将 compactor 以可选层集成到默认 EventStore/SnapshotStore 写入路径
- [x] 2.5 增加单元测试与向量对齐测试

## 3. Python SDK：EventCompactor

- [x] 3.1 定义 `EventCompactor` 接口（push/flush/metrics）与默认实现
- [x] 3.2 实现 `*_CHUNK` 文本/工具事件合并规则（保持拼接顺序；不同 `messageId/toolCallId` 不串扰）
- [x] 3.3 实现与 `maxReplayEvents` 协同的快照化截断策略
- [x] 3.4 将 compactor 以可选层集成到默认 EventStore/SnapshotStore 写入路径
- [x] 3.5 增加单元测试与向量对齐测试

## 4. 文档与示例

- [x] 4.1 文档补齐：flush/compaction 策略（按时间/事件数/字节预算）与调参建议
- [x] 4.2 demo 增加“长 run”示例：展示 compaction 前后持久化事件数量与 resume 体验差异
