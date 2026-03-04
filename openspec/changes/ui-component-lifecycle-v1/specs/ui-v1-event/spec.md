## ADDED Requirements

### Requirement: UI 组件条目可携带 lifecycle 字段且可回放
系统 MUST 允许 `sharedState.ui.components[componentId]` 条目额外包含 lifecycle 字段（见 `ui-component-lifecycle`）：
- `status`
- `error`

这些字段 MUST 能被 `STATE_SNAPSHOT/STATE_DELTA` 回放恢复（属于 shared state 的一部分）。

#### Scenario: Snapshot restores component status
- **WHEN** `STATE_SNAPSHOT.snapshot.ui.components[componentId].status = "building"`
- **THEN** consumer 在重建 UI 时能读取到该 `status` 并进入对应渲染分支
