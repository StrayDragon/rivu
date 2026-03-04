## ADDED Requirements

### Requirement: A canonical integration quickstart exists
仓库 MUST 提供一份唯一且权威的集成 Quickstart 文档，用于定义将 Rivu 集成到既有应用中的推荐基线做法。

至少，该 quickstart MUST 覆盖：
- 如何通过 SSE 与 WebSocket 产出服务端 envelopes `{ seq, event }`
- 如何使用 `resumeFrom = lastSeq` 做断线续传
- 如何把 envelopes 输入到 `rivu-kernel`
- 如何使用 adapter registries 从 `sharedState.ui` 的 mounts 渲染 UI 组件

Quickstart MUST 与实际发布的 packages 与 examples 保持一致。

#### Scenario: Quickstart covers resume and UI mounts
- **WHEN** 开发者按照 quickstart 集成 SSE transport
- **THEN** 其可以把 `id: seq` + `data: event` 映射到 `kernel.dispatch({ seq, event })`，并从 `sharedState.ui` 渲染挂载的 UI

### Requirement: Official examples use a consistent default streaming event variant
官方 docs 与 examples MUST 使用一套一致的默认流式事件写法（用于 text/tool deltas）。

推荐默认写法 MUST 使用：
- 流式文本增量使用 `TEXT_MESSAGE_CHUNK`
- 流式 tool-call 参数增量使用 `TOOL_CALL_CHUNK`

docs MAY 提及 `TEXT_MESSAGE_CONTENT` / `TOOL_CALL_ARGS` 作为兼容替代方案，但 MUST NOT 在同一份指南中混用两套写法（除非明确说明原因）。

#### Scenario: Example maps deltas to chunk events
- **WHEN** 示例把 transport 层的 `delta/chunk` 映射到 AG-UI event
- **THEN** 示例代码使用 `TEXT_MESSAGE_CHUNK`（以及 `TOOL_CALL_CHUNK`）

### Requirement: ProtocolInspector exists for debugging `seq` and `sharedState.ui`
官方 framework adapters MUST 提供一个仅用于开发态的协议检查器 primitive（例如 `ProtocolInspector`），它暴露：
- `lastSeq`
- `needsResync` and `resyncReason`
- gap metadata (expected vs got sequence)
- 一个足以排查“为什么组件没渲染”的 `sharedState.ui` 摘要视图

#### Scenario: Inspector reveals a sequence gap
- **WHEN** kernel 因 `seq` gap 进入需要 resync 的状态
- **THEN** inspector 能显示 kernel state 中的 `expectedSeq` 与 `gotSeq`
