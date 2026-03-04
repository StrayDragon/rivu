## ADDED Requirements

### Requirement: Demo 展示 Chart 交互 round-trip
React demo MUST 包含一个 chart 交互示例：
- 用户点击图表 → 发送 `chart.setSelection`
- 服务端处理并返回 `STATE_DELTA` 更新 selection + revision
- 前端图表高亮对应选择并可回放

#### Scenario: Click updates selection highlight
- **WHEN** 用户点击某个 datum 并完成一次 round-trip
- **THEN** 图表高亮该 datum（或展示 selection 标签），并在刷新/重连后仍可从快照回放出相同高亮状态

