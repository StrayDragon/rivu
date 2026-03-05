## ADDED Requirements

### Requirement: Python SDK 解码并校验 `a2ui.v1`
Python SDK MUST 为 `a2ui.v1` payloads 提供严格的 decode/validate utilities，并支持可配置 limits。

#### Scenario: Decode 拒绝非法 A2UI
- **WHEN** Python 服务收到非法的 `a2ui.v1` payload
- **THEN** SDK 在进入业务逻辑之前拒绝它

### Requirement: Python SDK 将 `a2ui.v1` 编译为 `sharedState.ui` patch ops
Python SDK MUST 提供编译器，将 `a2ui.v1` payloads 转换为 RFC 6902 JSON Patch operations，用于发出变更 `sharedState.ui` 的 `STATE_DELTA`。

编译器 MUST 支持通过 `key -> componentId` 映射实现稳定 identity。

#### Scenario: 编译 create + mount 为 patch ops
- **WHEN** payload 创建组件并将其挂载到某个 message slot
- **THEN** 编译器返回用于创建组件条目并添加 mount 的 patch ops
