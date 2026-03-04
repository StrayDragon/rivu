## Context

当前 `rivu-react` workflow kit 已提供两个 stateful 组件并跑通 `ui.v1.event` round-trip：
- `ApprovalCard`（approve/deny）
- `FormCard`（setField/submit）

后端侧（Python/Rust）也已提供 `UiV1EventProcessor`：负责鉴权钩子、幂等（`clientRequestId`）、并发（`baseRevision` vs `revision`）与产出 `STATE_DELTA`。

但 PRD 中常见且关键的 workflow 交互仍缺失：
- 危险操作二次确认（Confirm）
- 长任务状态展示（Task status）

这两类如果由宿主各自实现，容易在 revision/幂等/审计落点上产生不一致，且无法复用 Rivu 现有“server-authoritative + replayable”链路。

## Goals / Non-Goals

**Goals:**
- 新增 `ConfirmCard`（stateful）与 `TaskStatusCard`（stateless）两类组件到 `rivu-react` workflow kit，并纳入 registry。
- 为 `ConfirmCard` 定义明确的事件集与 state 迁移规则，跑通 `ui.v1.event` → server → `STATE_DELTA` → UI 更新闭环。
- Python/Rust `UiV1EventProcessor` 对齐支持 `ConfirmCard` 的事件处理与 revision 语义。
- 在 demo/mock server 中提供可运行验收：确认 → 状态回写（并可附带 tool-call 展示作为示例，但工具执行仍归宿主后端）。

**Non-Goals:**
- 不在本变更实现真实的业务 tool（退款/删除/部署等）；只提供 UI 与事件语义，工具执行仍由宿主后端实现并审计。
- 不在本变更实现复杂的长任务日志流/实时订阅协议；`TaskStatusCard` 仅作为 `sharedState.ui` 驱动的展示组件。
- 不在本变更补齐 Svelte 侧 workflow UI kit（目前 `rivu-svelte` 仅提供 registry/resolve/chart）。

## Decisions

### 1) ConfirmCard 作为 stateful 组件，状态由服务端权威回写

**Decision:** `ConfirmCard` 是 stateful：用户操作只发送 `ui.v1.event`（例如 `confirm` / `cancel`），前端不本地提交为“已确认”。服务端验证后通过 `STATE_DELTA` 更新 `state` 与 `revision`。  
**Why:** 危险操作必须可审计且幂等；确认状态必须可回放/可恢复。  
**Alternatives:** stateless + 直接 tool 调用（前端越权风险）；本地乐观提交（与 server-authoritative 冲突）。

### 2) TaskStatusCard 保持 stateless，服务端通过 patch 更新 props

**Decision:** `TaskStatusCard` 不定义交互事件；其展示信息由服务端更新 `sharedState.ui.components[componentId].props`（或组件条目）实现。  
**Why:** 任务状态通常由后端编排驱动；UI 只展示。  
**Alternatives:** 把任务进度放入客户端本地状态（刷新/回放不一致）。

### 3) 事件命名保持最小集合，并与审计字段解耦

**Decision:** `ConfirmCard` eventName 只定义最小集合（`confirm` / `cancel`），payload 保持最小（必要时可加 `reason`），审计字段（user/thread/run/toolCallId）由宿主后端链路补齐，不写入前端组件 state。  
**Why:** `ui.v1.event` 是交互入口，不是审计存储；审计属于后端系统。  
**Alternatives:** 在组件 state 里写入审计（会污染回放真值且跨产品不一致）。

## Risks / Trade-offs

- [语义分歧] “确认”与“执行工具”之间的映射因宿主而异 → ConfirmCard 只负责确认事件；工具执行由宿主决定，Rivu 只要求 server-authoritative 回写。
- [事件处理扩展] `UiV1EventProcessor` 需要内置更多组件类型分支 → 保持 processor 的“最小示例性质”，同时在 docs 中明确：复杂业务可在宿主侧自建处理器或在此基础上扩展。

## Migration Plan

- 纯新增组件类型与 processor 分支：对现有宿主与 demo 为增量升级。
- 在 demo 中增加用例后，回归运行 types/test，确保不影响现有 `ApprovalCard/FormCard/Chart` 行为。

