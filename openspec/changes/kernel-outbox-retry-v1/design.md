## Context

`rivu-kernel` 当前实现了 outbox：`send(ui.v1.event)` 通过注入的 `actionTransport` 发往后端，并在 kernel state 中记录条目（pending/acked/failed）。kernel 也按 `clientRequestId` 做去重，避免同一动作重复发送。

但现状存在一个关键缺口：当一次发送失败（网络错误/临时后端错误）后，kernel 会保留 failed 条目，同时后续对同一 `clientRequestId` 的 `send()` 调用被直接视为 duplicate，导致宿主无法在 kernel 统一状态机内完成“安全重试”。这与 PRD 对 outbox “retry + 去重” 的目标不一致，也会迫使宿主绕过 kernel 自行实现重试与 UI 状态。

## Goals / Non-Goals

**Goals:**
- 定义并实现 outbox 的“失败可重试”语义：宿主能够对 failed 的 `clientRequestId` 重新发送同一 action，并保持 state 可观测。
- 保持去重语义：pending/acked 的重复调用仍然去重（不重复发 transport）。
- 提供最小的 outbox 维护策略：避免无界增长（上限/TTL/显式清理其一）。
- 不改变 server-authoritative 原则：`send()` 与 retry 不直接改写 `sharedState`，仍依赖后续 `dispatch()`。

**Non-Goals:**
- 不实现跨刷新持久化 outbox（例如 localStorage）；由宿主决定是否需要持久化。
- 不在 kernel 内实现指数退避/定时重试调度；kernel 只提供 retry 机制与状态，调度由宿主完成。

## Decisions

### 1) 提供显式 retry API，而不是隐式改变 `send()` 的去重语义

**Decision:** 提供一个明确的 retry 入口（例如 `kernel.retry(clientRequestId)` 或等价 API），用于对 `status="failed"` 的条目重新触发 transport。  
**Why:** 保持 `send()` 的“默认去重”直觉不变，同时让宿主显式表达“我确认要重试”。  
**Alternatives:** `send()` 在 failed 时自动重发（可能造成宿主误用与难以控制）。

### 2) Retry 复用同一 `clientRequestId`，依赖后端幂等兜底

**Decision:** retry 复用同一 `clientRequestId`，并依赖服务端幂等去重保证不会重复生效。kernel 侧仅保证“failed 可再次尝试发送”。  
**Why:** `clientRequestId` 是跨端幂等边界；换新 id 会破坏“同一动作”的审计与幂等语义。  
**Alternatives:** 生成新 id 并在客户端做映射（复杂且审计链路更难对齐）。

### 3) Outbox 维护策略：提供最小清理能力

**Decision:** 提供一个最小 outbox 清理能力（例如 `clearOutbox({ keepLastN, keepFailed, beforeMs })` 或等价策略），默认不自动清理但提供可选上限。  
**Why:** 避免长会话下 outbox 无限增长；同时不把策略强绑进 kernel。  
**Alternatives:** 永不清理（潜在内存增长）；强制 TTL（可能影响审计/调试）。

## Risks / Trade-offs

- [服务端幂等依赖] retry 安全性依赖服务端对 `clientRequestId` 的幂等实现 → 文档明确要求；demo/mock server 也必须展示幂等行为。
- [状态复杂度] outbox 增加 retry 相关字段（attempt count/last error） → 保持最小字段集合；不在 kernel 内做调度。

