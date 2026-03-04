## Context

Rivu 需要交付一套以 **AG-UI 事件流**为标准的“可交互生成式 UI runtime + 组件 kit”，并能以最小侵入接入现有宿主前端（Zirvox / Crystalith），同时提供 Python/Rust 后端 SDK 以支持 `seq + resumeFrom`、存储/快照、重放/导出、以及 `CUSTOM(name="ui.v1.event")` 交互回传处理。

关键约束（来自 PRD）：
- **协议**：AG-UI 作为 wire format；UI 扩展统一用 `CUSTOM(name="ui.v1.event")`，UI 数据放在 `state.ui`（v1）。
- **断线续传**：必须实现 `seq + resumeFrom`，并能从 ring-buffer/快照恢复。
- **安全边界**：工具默认后端执行；前端仅展示与回传交互（server-authoritative component state）。
- **分层**：`rivu-kernel`（框架无关）+ 薄 `rivu-react` / `rivu-svelte` 适配；不强绑定 Provider。
- **默认无外部服务**：dev/小场景以 in-memory ring-buffer + SQLite/文件快照跑通；Redis/Postgres 只能做可选 adapter。
- **宿主栈兼容**：Zirvox/Crystalith 当前为 pnpm@10.29.2、React 19、TS 5.9、Vite 7、ESM；Rivu TS 包需 ESM-first、类型完整、可 tree-shake，并尽量不使用 Node-only API（浏览器端使用 Web Crypto）。

兼容性勘察（只读结论，用于确定最薄接入面）：
- Zirvox：`frontend/web/src/pages/ChatPage.tsx` 通过 WS `GatewayEvents.CHAT` 的 `delta/final/abort` 事件拼接 `assistantDraft` 并维护 history；最薄接入点是把这些流式片段转换为 AG-UI 文本/状态事件并用 `seq` wrapper 喂给 kernel，然后用 kernel state 驱动渲染（无需重写整套 Chat UI）。
- Crystalith：`frontend/web/src/features/workspace/domains/messages/useChat.ts` 通过 SSE `chunk/done/error` 更新一条 streaming assistant message，并在 message content 内嵌 `[[crystalith-ui:v1]]` JSON envelope；`ChatPanel.tsx` 解析 envelope 并用 `chatUiComponentRegistry` 渲染组件。最薄接入点是提供 AG-UI SSE/WS 的消费与 `state.ui` 驱动的 ComponentRenderer/registry，并让宿主用少量 glue code 替换“解析 envelope + registry”的部分。

## Goals / Non-Goals

**Goals:**
- 定义并落地 `ui.v1.event` + `state.ui`（v1）跨语言 schema（TS zod / Python pydantic / Rust types）与 golden vectors。
- 实现可嵌入的 `rivu-kernel`：`dispatch/getState/subscribe/send`，具备顺序校验、去重、gap 检测与 resync 钩子，以及 server-authoritative UI state 的 reducer/selectors/outbox。
- 提供默认无外部服务的后端侧存储/恢复：in-memory ring-buffer EventStore + SQLite/文件 SnapshotStore，并能用于 resume/review/export。
- 提供 `rivu-react` / `rivu-svelte` 最薄适配：外部 store 订阅（React `useSyncExternalStore`、Svelte `readable`）、registry、ComponentRenderer、UnknownComponent 降级。
- 交付 Viewer（Crystalith）与 Workflow（Zirvox）两类 profile 的 MVP 组件：Viewer 以 stateless 可回放/可导出为主；Workflow 至少 1 个 stateful 组件跑通 round-trip（`ui.v1.event` → 后端 → `STATE_DELTA` → UI 更新），并具备幂等与 revision 冲突语义。

**Non-Goals:**
- 不做完整 Agent/Orchestrator 框架，不替代宿主现有编排。
- v1 不做 CRDT；并发以 revision/etag（默认）或锁/租约（可选）表达。
- 不保证第三方 AG-UI 客户端理解我们的 UI 扩展（扩展是可选的）。
- 不强推 Thread UI Kit；宿主可仅采用 Render Primitives 嵌入现有 Chat UI。

## Decisions

### D1. 扩展事件与 UI 状态的落点

**选择：**
- UI 交互回传统一为 `CUSTOM(name="ui.v1.event")`，payload 最小字段：`componentId/eventName/payload/clientRequestId/baseRevision`。
- UI 组件数据与并发控制落在 `state.ui`：`components[componentId] = { type, schemaVersion, props, state, revision, mounts... }`。

**理由：**
- `STATE_SNAPSHOT/STATE_DELTA` 可自然承载 UI tree，实现“刷新恢复/回顾/导出”。
- `revision + baseRevision` 能明确并发语义并与幂等（clientRequestId）配合。

**替代方案：**
- 通过 `ui.v1.mount/patch/unmount` 事件维护 UI tree：更接近事件溯源，但回放成本更高、需要额外聚合逻辑；v1 暂不采用。

### D2. `seq + resumeFrom` 的传输封装

**选择：**
- SSE：使用 `id: <seq>`，客户端重连通过 `Last-Event-ID` 或 `?resumeFrom=<seq>`。
- WS：使用 wrapper `{"seq": number, "event": <AgUiEvent>}`，握手携带 `resumeFrom`。
- Kernel 侧严格校验：`seq == lastSeq+1` apply；`seq <= lastSeq` 丢弃；`seq > lastSeq+1` 触发 gap → resync（通过回调/错误将控制权交给宿主 transport）。

**理由：**
- 把顺序/续传约束放在 transport meta，避免污染 AG-UI 事件语义。
- gap 明确时快速 fail-fast，避免“悄悄丢事件”造成 UI/审计不一致。

**替代方案：**
- 允许 kernel 内部自动拉取补齐：会让 kernel 绑定网络与鉴权，不符合 headless-first 约束。

### D3. Kernel API 与运行模型（framework-agnostic）

**选择：**
- Kernel 是一个可嵌入对象，核心接口：`dispatch(envelope)`、`getState()`、`subscribe(listener)`、`send(action)`。
- `send(action)` 不做网络请求，仅把 action 交给宿主注入的 `actionTransport`，并在 kernel 内维护 outbox 状态（pending/acked/failed、按 `clientRequestId` 去重）。

**理由：**
- 宿主能在不重写 UI 外壳的情况下引入 kernel：把现有 streaming 事件喂进去即可。
- Provider/hook 只作为适配层的可选糖，不成为强耦合入口。

**替代方案：**
- Redux/Provider 体系：会把宿主绑定到特定状态管理范式，违反“像水一样可嵌入”的目标。

### D4. 存储：默认零外部服务（后端 SDK 负责）

**选择：**
- 默认实现提供：
  - `InMemoryRingBufferEventStore`：每 thread 保留最近 N 条 `{seq,event}`（用于短期断线补发）。
  - `SqliteSnapshotStore`（或文件快照）：按策略写入 `STATE_SNAPSHOT`（包含 `state.ui`），用于刷新恢复/回顾/导出。
- Redis/Postgres 仅作为可选 adapter 接口（v1 不强制启用）。

**理由：**
- 满足“dev/小场景无需外部服务即可跑通”的硬约束。
- 快照把“重放预算”变成可控参数（`maxReplayEvents`）。

**替代方案：**
- 全量事件落库（仅 Postgres）：审计强但写放大大；且违反默认无外部依赖目标。

### D5. 跨语言一致性（golden vectors）

**选择：**
- 在 `rivu-ui-spec` 提供：
  - `ui.v1.event` schema（TS zod / Py pydantic / Rust types）与 JSON schema（用于 golden vectors 与文档）。
  - Golden vectors：同一事件序列在 TS/Py/Rust 的 encode/decode/validate 结果一致，并且对“可重放的派生状态”（至少包含 `lastSeq` 与 `state.ui`）reduce 结果一致。

**理由：**
- 这是断线续传、回顾、导出与审计一致性的基础；不做会导致前后端各自“看起来能跑”但长期不可维护。

**替代方案：**
- 只测 encode/decode 不测 reduce：会把关键逻辑分歧推迟到线上才暴露，成本更高。

### D6. 组件 registry 与 UnknownComponent 降级

**选择：**
- registry 以白名单形式存在：`componentType -> { schemaVersion, propsSchema, stateSchema?, renderer }`。
- 渲染路径默认 fail-fast（开发态 throw / 生产态降级到 `UnknownComponentCard`），不会让未知组件炸整页。

**理由：**
- 安全与稳定性：模型输出不可信；必须做 schema 校验与降级。
- Viewer profile 强依赖“历史可回放”；schemaVersion 是回放稳定性的关键锚点。

**替代方案：**
- 直接渲染任意 JSON：短期省事但安全与可维护性极差。

## Risks / Trade-offs

- [跨语言一致性复杂度] → 将 golden vectors 收敛到 v1 MVP 覆盖的事件子集，并强约束 canonical JSON 序列化（字段顺序不依赖、unicode/float 处理一致）。
- [无外部服务的可用性边界] 进程重启会丢 ring-buffer → 强制依赖快照恢复；对长 run 采用基于 `maxReplayEvents` 的快照策略。
- [宿主迁移成本] 现有 Zirvox/Crystalith 逻辑偏“拼接草稿/解析 envelope” → 通过 Layer 0/1 的最薄接入面（kernel + render primitives）降低改动面，并提供示例 glue code。
- [安全面扩大] `ui.v1.event` 来自前端且不可完全信任 → SDK 默认提供大小/深度/速率限制与鉴权/幂等/并发控制模板。
- [clean-room 风险] 参考 Tambo 交互范式但禁止复制实现细节 → 设计与代码结构保持自研命名与抽象，避免照搬文件结构/API 形状。

