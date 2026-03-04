## ADDED Requirements

### Requirement: `ui.v1.event` 校验器支持结构规模 limits
SDK validators MUST 支持按 `security-limits-policy` 中定义的 `UiInputLimitsV1` 对 `CUSTOM(name="ui.v1.event")` 做限额校验。

至少，validators MUST 支持：
- `decode.maxBytes` / `decode.maxDepth` / `decode.maxStringLength`（用于整条事件 JSON）
- `uiEvent.maxPayloadKeys`（用于 `value.payload` 顶层 key 数量）

当任一 limits 被触发时，validators MUST 拒绝该事件，并返回 `LIMIT_EXCEEDED` 结构化错误。

#### Scenario: Reject payload with too many keys
- **WHEN** `uiEvent.maxPayloadKeys = 2` 且 `ui.v1.event.value.payload` 顶层包含 3 个 key
- **THEN** validators 拒绝该事件并返回 `LIMIT_EXCEEDED`（`limit="uiEvent.maxPayloadKeys"`）

