## ADDED Requirements

### Requirement: Python SDK 以统一 limits 结构解码与校验输入
Python SDK MUST 支持以 `UiInputLimitsV1`（见 `security-limits-policy`）作为统一入参，对以下输入进行 decode/validate：
- `CUSTOM(name="ui.v1.event")`
- `sharedState`（至少包含 `sharedState.ui`）
- JSON Patch ops（用于生成/接收 `STATE_DELTA`）

当检测到 limits 超限时，SDK MUST 返回/抛出结构化的 `LIMIT_EXCEEDED` 错误（至少包含 `limit/max/observed`）。

#### Scenario: Decode rejects oversized `ui.v1.event`
- **WHEN** `decode.maxBytes` 被设置，且收到的 `ui.v1.event` JSON 超过该阈值
- **THEN** SDK 在进入业务逻辑前拒绝并返回 `LIMIT_EXCEEDED`

### Requirement: Python SDK 的 patch builder 支持 ops/path 边界
Python SDK MUST 提供工具函数，用于在构建 `STATE_DELTA` 时强制执行 `jsonPatch` limits（至少 `maxOps` 与 `allowedPathPrefixes`）。

#### Scenario: Patch builder rejects disallowed path
- **WHEN** `jsonPatch.allowedPathPrefixes = [\"/ui\"]` 且调用方尝试构建 `path=\"/messages/0\"` 的 patch op
- **THEN** SDK 拒绝该 patch 并返回 `LIMIT_EXCEEDED`（或等价的策略拒绝错误）

