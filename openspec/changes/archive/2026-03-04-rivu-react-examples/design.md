## Context

- Rivu v1 MVP 已实现 `rivu-kernel`（seq/merge/outbox）与 `rivu-react`（registry + `ComponentRenderer` + viewer/workflow MVP 组件）。
- 现有文档覆盖了 API 与接入方式，但缺少一个可运行的 React demo 来验证：
  - 不使用 Provider 也能渲染与交互（“最薄接入面”）
  - `state.ui.components[].mounts` 的 inline/sidebar 嵌入范式
  - workflow 组件的 `ui.v1.event` 往返（server-authoritative state + baseRevision 并发控制）

## Goals / Non-Goals

**Goals:**
- 新增 `examples/` 下的 Vite React TS demo 项目，一键 `pnpm dev` 跑起来。
- demo 覆盖所有 v1 MVP viewer/workflow 组件，并展示 mounts 的 inline/sidebar 渲染入口。
- demo 内置 mock server（同进程模拟）来体现 server-authoritative 语义：
  - 校验 `baseRevision == component.revision`
  - 按 `clientRequestId` 幂等去重（in-memory）
  - 产出 `STATE_DELTA` patch 更新 `state.ui.components[componentId].state` 与 `revision`

**Non-Goals:**
- 不在 demo 中实现真实 SSE/WS transport、ring-buffer、SQLite snapshot（这些由 server SDK 与 docs 覆盖）。
- 不引入 tailwind/shadcn 等设计系统依赖（demo 只做轻量样式）。

## Decisions

- **Project**：`examples/rivu-react-demo/`，Vite 7 + React 19 + TS 5.9。
- **Integration style**：不使用 `RivuProvider`；全部通过 `<ComponentRenderer kernel registry />` 传参，演示“可部分接入”。
- **Mounts rendering**：用 `selectMountedUiComponentsV1({ messageId, slot })` 做 chat-like 嵌入示例，slot 使用 PRD 推荐的 `inline | sidebar`。
- **Mock server**：仅实现 v1 workflow 组件需要的事件处理（ApprovalCard/FormCard），逻辑对齐 Python/Rust SDK 的 `UiV1EventProcessor`（但不复制实现细节）。

## Risks / Trade-offs

- [demo 运行环境与宿主不一致] → 依赖保持最小（Vite/React/TS），并使用 workspace 依赖 `rivu-*`。
- [mock server 误导真实网络链路] → README 明确说明：mock 仅用于演示协议语义；真实 resume/store 参考 server SDK。
