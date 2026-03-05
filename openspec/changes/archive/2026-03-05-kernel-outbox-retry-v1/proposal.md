## Why

PRD 对 kernel outbox 的定位不仅是“按 `clientRequestId` 去重”，还包括 **action retry**：在网络抖动、短暂断线、或后端临时错误的情况下，宿主应能安全地重试同一次用户动作，并依赖后端的 `clientRequestId` 幂等保证“不重复生效”。

当前 `rivu-kernel` 已记录 outbox 条目（pending/acked/failed），但一旦失败，`send()` 会因为 outbox 已存在而直接返回 duplicate，导致宿主无法对同一 `clientRequestId` 执行重试；这会迫使宿主绕过 outbox 自己做重试/状态机，破坏“可复用 runtime”的目标。

## What Changes

- 扩展 kernel outbox 能力，支持对失败条目的安全重试：
  - 提供明确的 retry API（例如 `kernel.retry(clientRequestId)` 或等价机制）
  - 或者允许对 `status="failed"` 的同一 `clientRequestId` 重新发送（并保持 pending/acked/failed 状态机可观测）
- 增强 outbox 可观测性与维护策略：
  - 允许宿主查询/筛选 outbox 条目（便于 UI 展示与调试）
  - 提供可选的 outbox 清理策略（上限/TTL/显式清理）避免无限增长
- 更新文档与 demo：演示一次失败后重试成功，并且不改变 server-authoritative state（仍必须由后续 envelopes 驱动）。

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `kernel-runtime`: outbox REQUIREMENTS 增加“失败可重试”的规范行为与最小 API 形状。

## Impact

- `packages/rivu-kernel`: `send()`/outbox 状态机与公开 API 需要扩展；需要新增单测覆盖 retry 行为与去重边界。
- `packages/rivu-react`/`packages/rivu-svelte`（可选）：在 `ProtocolInspector` 或 demo 中展示 outbox retry 状态（不要求 UI kit 强绑定）。
- `docs/`: 补齐 outbox retry 的推荐集成方式与注意事项（server 幂等依赖 `clientRequestId`）。

