## Why

PRD 已明确风险：如果把 token 级的流式增量（文本 chunk、tool chunk、细粒度 `STATE_DELTA`）原样落库，会带来严重的写放大与 replay 成本，长对话/长 run 会很快把存储与带宽打爆。我们需要一套规范化的“服务端 flush/compaction”策略，把高频小事件安全合并为低频大事件，同时不破坏 `seq/resume` 与回放一致性。

## What Changes

- 引入事件压缩（compaction）能力：
  - 定义哪些事件可以被合并、合并后的语义等价条件、以及何时触发 flush（按时间/事件数/字节预算）
  - 为消息与工具流式事件提供“可重放的合并形式”（例如合并多段内容增量为更少事件）
  - 为 UI state 更新提供可选的 compaction（合并连续 patch、或通过快照重建减少 patch 链）
- 在 server SDK 中提供参考实现（可替换）：event accumulator/compactor + 与 EventStore/SnapshotStore 的协作方式
- 为 compaction 行为补齐跨语言一致性测试（同一事件流 compaction 后仍能归约出等价的 shared state）

## Capabilities

### New Capabilities
- `event-compaction`: 定义事件压缩/flush 的规则、触发条件与语义等价约束。

### Modified Capabilities
- `event-store-snapshot`: 增加“写放大控制”的规范性要求：支持 compaction/flush，并与 snapshot policy（replay budget）协同。
- `server-sdk-python`: 增加 event accumulator/compactor 的最小 API 形状与默认实现要求。
- `server-sdk-rust`: 同上。
- `seq-resume`: 明确 compaction 不改变 `seq` 语义，并约束“被压缩后 replay 的一致性”。

## Impact

- `python/` 与 `crates/`: 需要新增 compactor 模块、并在默认 store 适配中集成（可开关）。
- `packages/rivu-ui-spec`: 需要新增 compaction 相关的测试向量（输入事件流 → compaction 后事件流 → reduce 等价）。
- `docs/` 与 demos: 需要提供默认 flush 策略示例（例如每 5s/每 1000 事件/每 N KB 触发）与调参指南。
