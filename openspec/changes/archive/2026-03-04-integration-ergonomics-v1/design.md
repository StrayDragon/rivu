## Context

Rivu 的 MVP 形态已经具备：
- `seq + resumeFrom` 的严格顺序语义（kernel）
- `STATE_SNAPSHOT/STATE_DELTA` 驱动的 `sharedState` 归约（含 `sharedState.ui`）
- React/Svelte adapter + registry + UnknownComponent 降级

但当前“第一次集成”仍存在典型 DX 问题：
- 事件类型与示例不够一致（例如 demo 使用 `TEXT_MESSAGE_CONTENT`，集成文档偏向 `TEXT_MESSAGE_CHUNK`）
- 对 UI state 的命名在 PRD/spec/docs/代码之间存在映射成本（PRD 写 `state.ui`，代码暴露 `sharedState.ui`）
- 服务端更新 `sharedState.ui` 需要手写 JSON Patch（mount、props 更新、revision 递增等），容易出错
- 缺少可复用的开发态观测组件（`seq/gap/needsResync`、最近事件、`sharedState.ui`）来快速定位“为什么没渲染/为什么需要 resync”

受影响的主要利益相关者：
- Crystalith（Viewer 为主）：希望快速把 SSE 流 + `state.ui` 渲染落地，并可稳定回放/导出
- Zirvox（Workflow 为主）：希望把 WS 事件与工具链路迁移到 AG-UI，并可在 gap/resync/断线场景下快速定位问题

## Goals / Non-Goals

**Goals:**
- 明确并统一“推荐集成形状”，让用户按文档/示例能直接成功（低歧义、低 footgun）。
- 保持 headless-first：kernel 不做网络；React/Svelte Provider 仍是可选糖。
- 提供可选的集成辅助能力：
  - adapter helpers（SSE/WS → `{ seq, event }` → kernel）
  - `ProtocolInspector`（开发态）用于观测 `seq/gap/resync` 与 `sharedState.ui`
  - Python/Rust SDK 的 `sharedState.ui` JSON Patch 构建 helpers
- 修复 spec/docs 中与当前实现不一致的表述，降低认知开销（以 `sharedState.ui` 为准）。

**Non-Goals:**
- 不引入新的强绑定“客户端框架/Provider”；不把 transport 逻辑内置到 kernel（仍由宿主负责连接与重连）。
- 不改变 AG-UI 语义本身；不引入新的 wire-level 协议。
- 不在 v1 强制实现“服务端 ACK 事件”或复杂 outbox 协议（保持当前 `send(action)` 语义简单可用）。

## Decisions

### 1) 事件类型统一：推荐用法 + 兼容用法并存

**Decision:** 文档与示例选择一套“推荐的流式事件类型”作为默认（文本与工具），并在 kernel 中继续兼容相关别名/变体。  
**Rationale:** 降低用户在初次集成时的选择成本，同时不破坏已有生产者。  
**Alternatives:** 强制迁移（BREAKING）移除别名会造成不必要的集成负担。

### 2) `sharedState.ui` 作为规范性的实现表述

**Decision:** 在 Rivu 的实现与 SDK 文档中，以 `sharedState.ui` 作为明确表述；在 spec 中解释其与 PRD “`state.ui`” 的语义映射。  
**Rationale:** 当前代码与 SDK 已以 shared state 为归约对象；统一口径能显著减少集成困惑。  
**Alternatives:** 将代码层字段整体改名为 `state`（潜在 BREAKING），收益与风险不成比例。

### 3) Patch builder 下沉到服务端 SDK（Python/Rust）

**Decision:** 把 `sharedState.ui` 的 JSON Patch 构建 helpers 放到 Python/Rust SDK 中，提供可组合的小函数（mount/update/replace/increment-revision）。  
**Rationale:** 真实集成中，服务端最常做的是“构造正确 patch”，而不是“应用 patch”；helpers 能显著降低错误率与重复劳动。  
**Alternatives:** 仅提供文档示例（仍需要用户手写 patch）无法解决长期 DX 成本。

### 4) `ProtocolInspector` 作为 adapter 层的可选 devtool

**Decision:** 在 `rivu-react` / `rivu-svelte` 提供可选的 `ProtocolInspector` 组件/primitive（默认开发态使用），展示 kernel 可观测信息与 `sharedState.ui` 片段。  
**Rationale:** gap/resync 是最常见的“看不见”问题来源；devtool 能把排障时间从小时级降到分钟级。  
**Alternatives:** 仅靠 demo 的 DebugPanel（不可复用）不足以覆盖真实宿主项目需求。

## Risks / Trade-offs

- [API 扩散] 增加 helpers/devtool 可能让包的导出面变大 → 控制为可选导出、tree-shakable，并清晰区分“核心 API”与“辅助 API”。
- [文档一致性] 多处文档/示例需同步更新 → 将推荐用法集中到一份“Integration Quickstart”，其余文档引用该基线。
- [跨语言一致性] Python/Rust helpers 需要保持同语义 → 用 golden vectors/示例 patch 进行对齐，并在 spec 中明确行为。
