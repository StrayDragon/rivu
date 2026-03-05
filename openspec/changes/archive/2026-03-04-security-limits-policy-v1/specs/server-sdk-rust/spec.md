## ADDED Requirements

### Requirement: Rust SDK 以统一 limits 结构解码与校验输入
Rust SDK MUST 支持以 `UiInputLimitsV1`（见 `security-limits-policy`）作为统一入参，对以下输入进行 decode/validate：
- `CUSTOM(name="ui.v1.event")`
- `sharedState`（至少包含 `sharedState.ui`）
- JSON Patch ops（用于生成/接收 `STATE_DELTA`）

当检测到 limits 超限时，SDK MUST 返回结构化的 `LIMIT_EXCEEDED` 错误（至少包含 `limit/max/observed`）。

#### Scenario: Decode rejects payload with too many keys
- **WHEN** `uiEvent.maxPayloadKeys = 1` 且 `ui.v1.event.value.payload` 顶层包含多个 key
- **THEN** SDK 拒绝该事件并返回 `LIMIT_EXCEEDED`

### Requirement: Rust SDK 的 patch builder 支持 ops/path 边界
Rust SDK MUST 提供工具函数，用于在构建 `STATE_DELTA` 时强制执行 `jsonPatch` limits（至少 `maxOps` 与 `allowedPathPrefixes`）。

#### Scenario: Patch builder rejects too many ops
- **WHEN** `jsonPatch.maxOps = 5` 且调用方尝试构建 6 个 patch ops
- **THEN** SDK 拒绝并返回 `LIMIT_EXCEEDED`

