## ADDED Requirements

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

