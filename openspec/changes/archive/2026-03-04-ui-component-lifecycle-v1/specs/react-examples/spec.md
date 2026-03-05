## ADDED Requirements

### Requirement: Demo 展示“流式生成组件”的 lifecycle 链路
React demo MUST 包含一个 lifecycle 示例，用于验收 streaming UI 的占位体验：
- 先发送一个包含组件条目 `status="building"` 的 `STATE_SNAPSHOT` 或 `STATE_DELTA`
- 再通过后续 `STATE_DELTA` 补齐 props/state，并将 `status` 切换为 `"ready"`

#### Scenario: Demo transitions from skeleton to ready
- **WHEN** demo 先渲染 `status="building"` 的组件
- **THEN** 页面展示 skeleton
- **AND WHEN** demo 收到把 `status` 更新为 `"ready"` 的后续增量
- **THEN** 页面展示最终组件渲染结果

