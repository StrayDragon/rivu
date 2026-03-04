## ADDED Requirements

### Requirement: Rust SDK 提供 `sharedState.ui` JSON Patch builder helpers
Rust SDK MUST 提供 helper utilities，用于为常见的 `sharedState.ui` 变更构造 RFC 6902 JSON Patch 操作，而不要求调用方手写 patch JSON。

至少，helpers MUST 覆盖：
- 将组件 mount/unmount 到 message slot
- replace/set 组件 props
- replace/set 组件 state（仅对 stateful 组件）
- 递增组件 `revision`

#### Scenario: 不手写 JSON 构建 mount patch
- **WHEN** 服务需要把一个已存在的组件 mount 到 `sharedState.ui.components[componentId].mounts`
- **THEN** 它可以调用 SDK helper 生成 targeting `/ui/components/<componentId>/mounts` 的 patch operations
