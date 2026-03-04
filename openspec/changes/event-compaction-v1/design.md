## Context

Rivu 的事件流天然是“高频增量”的：文本消息可能以 chunk/delta 形式持续到达，工具调用参数与结果也可能流式分段，UI state 可能出现频繁小 patch。对在线用户来说这些增量很有价值（更丝滑的渲染）；但对 EventStore 来说，如果把这些小事件原样持久化，会导致：
- 写放大（大量小写入、索引膨胀）
- replay 成本不可控（断线续传要回放很多细粒度事件）
- 导出/审计的体积与性能变差

PRD 已提出需要 server-side flush/compaction。本变更把 compaction 变成规范化能力：定义可合并事件、触发条件与语义等价约束，并在 Python/Rust server SDK 提供参考实现。

## Goals / Non-Goals

**Goals:**
- 定义一套可测试的 compaction 规则：输入事件流 → compaction 后事件流（可更短）→ reduce 后 shared state 语义等价。
- 提供触发策略：按时间/事件数/字节预算 flush，并与 snapshot policy（replay budget）协同。
- 允许“热 replay 窗口”保留细粒度事件；较老事件可以被压缩为更粗粒度事件或快照。
- 在 SDK 中提供可替换的默认实现（宿主可禁用或自定义）。

**Non-Goals:**
- 不要求 compaction 覆盖所有事件类型；v1 只覆盖写放大最严重的几类（文本/工具/状态）。
- v1 不要求合并 `TEXT_MESSAGE_START/CONTENT/END` 等更细粒度事件；优先只对 `*_CHUNK` 事件做 compaction。
- 不改变 AG-UI core event 的 wire format；compaction 只改变“存储与回放”的事件集合。
- 不把 compaction 变成强制的“审计裁剪”；完整审计留给宿主选择的冷存储策略。

## Decisions

### 1) Compaction 发生在“存储边界”，不影响在线流式体验

**Decision:** 在线连接仍可收到细粒度 streaming 事件；EventStore/SnapshotStore 的写入路径引入可选 compactor，对落库事件做合并与 flush。  
**Why:** 兼顾在线体验与存储成本。  
**Alternatives:** 在传输层直接合并会降低实时渲染质量；在离线后台再合并会增加实现复杂度与一致性风险。

### 2) 允许 compaction 使旧 resume 点变得不可 replay，并用快照兜底

**Decision:** compaction 可以丢弃较老的细粒度事件，只保留更粗粒度事件/快照；当客户端 `resumeFrom` 落在被丢弃区间时，服务端通过发送 `STATE_SNAPSHOT` 重建基线后继续。  
**Why:** `seq-resume` 已允许“replay 不完整 → snapshot fallback”，这是控制成本的关键杠杆。  
**Alternatives:** 永远保留完整细粒度事件才能保证任意点 replay，会导致成本不可控。

### 3) UI state 的 compaction 优先采用“快照化”而不是无限 patch 合并

**Decision:** 对连续 `STATE_DELTA` 的 compaction，v1 推荐策略是当 patch 链过长/过大时生成新快照并截断历史（或将多 patch 合并为更少 patch 作为可选优化）。  
**Why:** patch 合并正确性复杂（RFC6902 组合与冲突），快照化更稳且更易验证。  
**Alternatives:** 全量 patch 合并虽更省，但容易引入边界 bug。

## Risks / Trade-offs

- [语义不等价] 合并规则写错会导致回放 state 偏移 → 用 golden vectors + reduce 等价测试覆盖关键组合。
- [调参复杂] flush 太频繁会增加快照写入；太稀疏会增加 replay → 提供默认策略与可观测指标（eventsSinceSnapshot、bytesSinceFlush 等）。
- [实现分歧] 多语言 compactor 行为可能不一致 → 规范化规则 + 向量驱动测试。
