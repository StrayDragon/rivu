## ADDED Requirements

### Requirement: Demo 演示推荐的 chunk 风格流式事件
React demo MUST 演示推荐的默认流式事件写法：
- `TEXT_MESSAGE_CHUNK` for streamed text deltas
- `TOOL_CALL_CHUNK` for streamed tool-call argument deltas

#### Scenario: Demo 使用 chunk 事件流式输出消息
- **WHEN** demo 以流式方式输出 assistant message content
- **THEN** 在结束 `TEXT_MESSAGE_END` 之前，它使用 `TEXT_MESSAGE_CHUNK` 事件（而不只是 `TEXT_MESSAGE_CONTENT`）

### Requirement: Demo 包含 ProtocolInspector 用于调试
React demo MUST 包含一个 `ProtocolInspector` 视图（或等价物），用于展示：
- `lastSeq`
- `needsResync` / `resyncReason`
- gap metadata and a `sharedState.ui` summary

#### Scenario: Demo 暴露 lastSeq 与 needsResync
- **WHEN** demo 运行时
- **THEN** 开发者可以打开 inspector 并观察 kernel state 的 `lastSeq` 与 resync 相关字段
