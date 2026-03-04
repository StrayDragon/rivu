## Context

Rivu 的输入面非常“开放”：它既要消费服务端流式 AG-UI 事件（`STATE_SNAPSHOT/STATE_DELTA` 等），也要接受客户端回传的 `CUSTOM(name="ui.v1.event")`，并且未来还会在服务端接收由 LLM 生成的 A2UI/datasets 等结构化 JSON。

这些输入本质上都应视为**不可信**：可能超大、超深、结构恶意（例如成千上万个组件、超长 rows、巨量 patch ops），或包含意外路径写入。当前实现与规范大多只覆盖 `max_bytes/max_depth` 这一层级，缺少对“结构规模（components/mounts/datasets/rows）”与“patch 安全边界（ops/path）”的统一约束，也缺少跨 TS/Python/Rust 的一致错误语义与默认值建议。

本变更在不改变 AG-UI 事件语义的前提下，引入一套统一的 limits/policy：把限额维度、默认建议、错误语义与跨语言一致性测试明确下来，并要求 kernel 与 server SDK 在关键边界强制执行。

## Goals / Non-Goals

**Goals:**
- 定义一套统一的 limits 配置模型（跨 TS/Python/Rust 同语义），覆盖 decode、`sharedState.ui` 结构规模、以及 JSON Patch 安全边界。
- 为 Viewer/Workflow 两类 profile 提供推荐默认值（可被宿主覆盖）。
- 规定超限时的 fail-fast 语义与可诊断错误信息（便于日志、`ProtocolInspector` 与集成排障）。
- 通过 golden vectors/测试保证跨语言一致性（同一输入在三端一致接受/拒绝）。

**Non-Goals:**
- 不在 v1 内实现完整的 RBAC/ABAC/tool policy（权限/审计/限流属于更高层的业务与执行策略）。
- 不试图“净化”任意 UI props（例如 HTML sanitizer）；本变更只定义结构与大小边界。
- 不改变 AG-UI core event 的 wire format；仅在 Rivu 的 decode/compile/apply 边界增加约束。

## Decisions

### 1) 以“统一 limits 结构”作为跨语言契约

**Decision:** 引入一个规范性 limits 结构（在 `security-limits-policy` capability 中定义），并要求 TS/Python/Rust 映射到各自的类型与实现。  
**Why:** 避免三端各自演化出不兼容的 `maxBytes/maxDepth/...` 参数集合。  
**Alternatives:** 继续仅在各语言 SDK 中零散添加参数，会导致长期分裂与集成困惑。

### 2) 将 limits 分为三类：decode / uiState / jsonPatch

**Decision:** limits 分层表达并独立可配：  
- `decode`: JSON 体量与深度等通用限制  
- `uiState`: `sharedState.ui` 的结构规模限制（components/mounts/datasets/rows/cols）  
- `jsonPatch`: patch ops 的数量与路径安全边界  
**Why:** 不同入口的风险面不同（例如 `ui.v1.event` 与 `STATE_SNAPSHOT`），需要可分别收紧/放宽。  
**Alternatives:** 单一全局 limits 很容易出现“为了某入口放宽导致另一入口失守”。

### 3) Kernel 也必须做防御性限制（即使服务端已校验）

**Decision:** kernel 在应用 `STATE_SNAPSHOT/STATE_DELTA` 时同样强制执行 `uiState/jsonPatch` limits，超限不应用，并暴露诊断元数据。  
**Why:** 防御性设计：服务端可能配置错误、版本不一致或被绕过；前端仍需要避免崩溃与资源耗尽。  
**Alternatives:** 仅依赖服务端会让浏览器成为单点故障面。

### 4) 超限语义：fail-fast + 可诊断 + 不推进 lastSeq

**Decision:** 当检测到超限输入时，实现 MUST：
- 拒绝该输入（不应用，不产生部分写入）
- 不推进 `lastSeq`（对 inbound envelopes）或不进入业务逻辑（对 inbound `ui.v1.event`）
- 返回/暴露结构化错误（至少包含 limit 名称与阈值）
**Why:** 避免“半应用”导致不可回放状态；并让集成层可快速定位问题。  
**Alternatives:** 静默截断或部分应用会制造不可预期的 UI 与调试地狱。

## Risks / Trade-offs

- [误伤合法大输入] 默认值过严可能拒绝真实场景 → 提供 profile 默认值 + 宿主可配置；并提供可观测的错误帮助调参。
- [跨语言一致性成本] limits 维度增加会引入实现差异 → 用 golden vectors/CI 作为长期护栏。
- [性能开销] 结构检查会增加 CPU → 优先做 cheap pre-check（bytes、ops 数量），并在必要时才做深度/结构遍历。
