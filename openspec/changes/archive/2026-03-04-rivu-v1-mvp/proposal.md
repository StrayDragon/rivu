## Why

Zirvox 与 Crystalith 已各自实现了对话与流式链路，但协议与 UI 扩展形态不统一（WS delta/final/abort vs SSE + 自定义 envelope），导致“可交互生成式 UI”难以稳定落地：断线续传/刷新恢复、审计与幂等、以及组件 state 的权威边界都缺失或不一致。现在需要一套以 **AG-UI 事件流**为标准、可在现有宿主前端“像水一样”嵌入的 UI runtime 与最小组件集，把这些产品级能力做成可复用的基础设施。

## What Changes

- 新增 `rivu-ui-spec`：定义 `CUSTOM(name="ui.v1.event")` 与 `state.ui`（v1）规范，并提供跨语言 golden vectors。
- 新增 `rivu-kernel`：framework-agnostic 的状态机/reducer/outbox，支持 `seq + resumeFrom`、gap 检测与 resync、以及 server-authoritative UI state。
- 新增默认存储实现：in-memory ring-buffer EventStore + SQLite/文件 SnapshotStore（dev/小场景零外部依赖），并预留可选 Redis/Postgres adapter 接口。
- 新增 `rivu-react` / `rivu-svelte`：最薄适配层（hooks/stores/registry/renderer primitives），不强依赖 Provider；可把宿主现有 Chat UI 接上 kernel。
- 新增 UI 组件 MVP：覆盖 Viewer（Crystalith）与 Workflow（Zirvox）各自 P0 组件与交互回传（按 PRD 清单与 DoD）。
- 新增后端 SDK：`rivu-server-sdk-python` / `rivu-server-sdk-rust`，提供严格的 encode/decode/validate + store/resume + `ui.v1.event` 处理工具（SDK 不是独立服务）。
- 新增集成指南与测试：seq/resume、store/snapshot、state merge、幂等/并发语义、以及跨语言一致性测试。

## Capabilities

### New Capabilities

- `ui-v1-event`: 定义 `CUSTOM(name="ui.v1.event")` 的 schema、输入校验、以及 `state.ui`（v1）数据形状；提供跨 TS/Python/Rust 一致的 golden vectors。
- `seq-resume`: 定义 `seq + resumeFrom` 的传输 wrapper（SSE/WS）与客户端应用规则（顺序、去重、gap→resync）。
- `kernel-runtime`: 提供可嵌入的 kernel API（dispatch/getState/subscribe/send），实现 reducer/selectors/outbox 与 fail-fast 校验策略。
- `event-store-snapshot`: 提供 EventStore/SnapshotStore 抽象与默认实现（ring-buffer + SQLite/文件），支持 replay、快照、导出与恢复。
- `framework-adapters`: 提供 React/Svelte 的薄适配（无强制 Provider），包含 registry 与 ComponentRenderer 等 Render Primitives。
- `ui-components-mvp`: 提供 Viewer/Workflow 两个 profile 的最小组件集与 UnknownComponent 降级；支持 server-authoritative 的 stateful 交互 round-trip。
- `server-sdk-python`: Python SDK：事件/快照/seq 工具、校验与 `ui.v1.event` 处理辅助（零外部依赖默认实现）。
- `server-sdk-rust`: Rust SDK：与 Python 对齐的事件/快照/seq 工具、校验与 `ui.v1.event` 处理辅助（零外部依赖默认实现）。

### Modified Capabilities

- (none)

## Impact

- 宿主前端约束：Zirvox/Crystalith 目前均为 `pnpm@10.29.2`、React 19、TS 5.9、Vite 7、ESM；Rivu 的 TS 包必须 ESM-first、类型完整、可 tree-shake，且不强绑定 Provider 全家桶。
- Zirvox 现状入口：`frontend/web/src/pages/ChatPage.tsx` 以 WS 事件（delta/final/abort）拼接 `assistantDraft`；需要提供“把现有流式事件转成 AG-UI + seq”的最薄 adapter 与 state-driven 渲染接入点。
- Crystalith 现状入口：`frontend/web/src/features/workspace/domains/messages/useChat.ts` 以 SSE（chunk/done/error）流式更新，并通过 `[[crystalith-ui:v1]]` envelope + registry 渲染组件；需要提供 AG-UI 事件流与 `state.ui` 驱动的替代路径，同时保持最小 glue code。
- 后端影响：需要新增 Python/Rust SDK 与本地持久化（SQLite/文件）能力；Redis/Postgres 仅作为可选 adapter，不作为默认依赖。

