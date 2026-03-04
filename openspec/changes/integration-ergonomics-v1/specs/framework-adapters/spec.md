## ADDED Requirements

### Requirement: 适配层提供 ProtocolInspector 调试工具
官方 framework adapters MUST 提供一个仅用于开发态的协议检查器 primitive（例如 `ProtocolInspector`），用于调试 kernel state 与 `sharedState.ui`。

该 inspector MUST 默认 Provider-free：
- React：MUST 可通过显式 props 传入 `kernel`（以及可选 helpers）直接使用
- Svelte：MUST 可通过将 `kernel` 传入 store/primitive 使用，而不要求全局 context

#### Scenario: 不依赖 Provider 使用 ProtocolInspector
- **WHEN** 应用渲染 inspector 并显式传入一个 kernel 实例
- **THEN** inspector 可渲染且不要求全局 Provider 或全局 wiring

### Requirement: ProtocolInspector 暴露 resync 与 UI 摘要信息
inspector MUST 至少展示：
- `lastSeq`
- `needsResync` / `resyncReason`
- gap metadata (expected vs got)
- `sharedState.ui` 的摘要信息（例如组件数量 + 已挂载组件的 id/type 列表）

#### Scenario: Inspector 帮助排查 UI 缺失
- **WHEN** 某个组件因 `sharedState.ui.components` 缺失而无法渲染
- **THEN** inspector 能展示该 componentId 缺失，以及在选定 message/slot 下存在的 mounts
