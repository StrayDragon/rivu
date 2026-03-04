## ADDED Requirements

### Requirement: Kernel 对 `STATE_SNAPSHOT/STATE_DELTA` 执行防御性 limits
kernel MUST 在应用 `STATE_SNAPSHOT/STATE_DELTA` 之前，对输入执行防御性 limits 校验（即使服务端已校验）。

至少，kernel MUST 支持：
- `uiState.maxComponents`：限制 `sharedState.ui.components` 的条目数量
- `jsonPatch.maxOps`：限制 `STATE_DELTA.delta` 的 ops 数量
- `jsonPatch.allowedPathPrefixes`：限制 patch op 的 `path` 只能落在允许的 JSON Pointer 前缀集合内（默认 SHOULD 包含 `"/ui"`）

当检测到 limits 超限时，kernel MUST：
- 拒绝该 envelope（不应用到 `sharedState`）
- 不推进 `lastSeq`
- 设置 `needsResync = true`
- 设置 `resyncReason = "limit_exceeded"`
- 暴露结构化诊断信息（至少 `limit/max/observed`）

#### Scenario: Reject delta with too many patch ops
- **WHEN** `jsonPatch.maxOps = 10` 且收到 `STATE_DELTA` 的 `delta.length = 11`
- **THEN** kernel 拒绝该 envelope，不推进 `lastSeq`，并进入 `needsResync/resyncReason="limit_exceeded"`

#### Scenario: Reject delta that patches disallowed paths
- **WHEN** `jsonPatch.allowedPathPrefixes = ["/ui"]` 且某个 patch op 的 `path="/messages/0/content"`
- **THEN** kernel 拒绝该 envelope，并暴露 `LIMIT_EXCEEDED`（或等价的“被策略拒绝”诊断信息）

