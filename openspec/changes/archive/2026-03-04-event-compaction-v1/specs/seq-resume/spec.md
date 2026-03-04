## ADDED Requirements

### Requirement: 因 compaction 导致 replay 不完整时必须 snapshot 兜底
当服务端因 compaction/裁剪导致无法从 `resumeFrom` 提供连续 replay 时，服务端 MUST 使用 `STATE_SNAPSHOT` 进行兜底重同步，并在其后继续发送 `seq` 递增的事件。

服务端 MUST NOT 发送任何 `seq <= resumeFrom` 的 envelope。

#### Scenario: ResumeFrom 落在被裁剪区间时发送快照
- **WHEN** 客户端以 `resumeFrom = 50` 重连，但服务端已裁剪掉 `seq=51..99`
- **THEN** 服务端发送一个 `seq > 50` 的 `STATE_SNAPSHOT` 以重建基线，并继续发送后续 `seq` 递增事件

