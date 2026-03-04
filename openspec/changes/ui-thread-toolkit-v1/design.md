## Context

当前仓库已经具备：
- `rivu-kernel`：将 AG-UI envelopes `{seq,event}` 归约为 `messages/toolCalls/sharedState`，并暴露 gap/resync 状态与 outbox。
- `rivu-react`：Layer 1 primitives（`ComponentRenderer`、registry、`ProtocolInspector`）与 Viewer/Workflow 组件 kit。
- `examples/*`：演示 mounts、datasets、export、以及在宿主 UI（MUI / Tailwind）中通过 `--rivu-*` 融合外观。

但缺少 PRD 里明确提出的 **Layer 2：Thread UI Kit（可选）** 与通用 **ToolCards**。这导致“新项目快速起步”仍需重复实现：消息列表、tool call/result 展示、滚动容器、运行状态（gap/resync/streaming）提示，以及 mounts 的布局组合。

约束：
- 线程 UI 必须是 **可选**：不强制宿主采用，不引入 Provider 强绑定。
- 必须遵循“像水一样可塑形”：通过 `--rivu-*` tokens 融入宿主，且提供关键 slots/overrides。
- 不引入网络请求、不执行工具；只读渲染 + 发送 `ui.v1.event` 仍由已有组件完成。

## Goals / Non-Goals

**Goals:**
- 在 `rivu-react` 中提供一套可选 Thread UI Kit（Layer 2），可在不额外 glue code 的情况下渲染：
  - message list（支持 streaming 状态）
  - tool call / tool result cards
  - mounts（inline/sidebar）区域的默认布局容器
  - run 状态提示（`needsResync/resyncReason/gap` 等）
- Thread UI Kit 与 ToolCards 都遵循 tokens（`--rivu-*`）并提供最小覆盖入口（`className/style` + slots）。
- 示例补齐一个 thread-kit 展示页，作为回归用例（mounts + tool cards + resync 状态提示）。

**Non-Goals:**
- 不在本变更实现完整 Chat Composer / 输入框体验（属于宿主应用差异化部分）。
- 不实现虚拟列表/无限滚动/复杂可访问性导航（先提供可工作的基础实现）。
- 不在本变更引入 Svelte 侧 Thread UI Kit（如需可另开 change；本变更聚焦 React）。
- 不改变 kernel 的协议语义与 reducer；Thread UI Kit 只是基于现有 state 的渲染层。

## Decisions

### 1) Thread UI Kit 以“组合 primitives”为核心，而非替代宿主

**Decision:** `ThreadView` 作为组合入口，但内部由更小的组件（`MessageList/MessageBubble/ToolCallCard/ToolResultCard/RunStatus`）构成，宿主可只选用其中部分。  
**Why:** 既满足“新项目一键起步”，又不违背“老项目不需要重写外壳”的原则。  
**Alternatives:** 单体 Thread 组件（难以替换/裁剪）；强制 Provider（与 PRD 冲突）。

### 2) 组件 API 不依赖 Provider：显式传入 `kernel`（与 registry）

**Decision:** Thread Kit 组件与 ToolCards 统一显式接收 `kernel`（以及渲染 mounts 所需的 `registry`），内部用 `useKernelState` 订阅。  
**Why:** 与现有 `ComponentRenderer` 设计一致，保持“可嵌入的库对象”体验。  
**Alternatives:** 必须包 Provider（会在宿主集成中制造额外约束与耦合）。

### 3) ToolCards 与 kernel tool state 的映射规则固定、但渲染可覆盖

**Decision:** ToolCards 只读取 kernel 的 `toolCalls`（`TOOL_CALL_*` 归约结果）与 tool result message（`TOOL_CALL_RESULT` 归约为 role=tool 的 message），提供默认关联展示逻辑，并为关键区域提供 slots。  
**Why:** 让“工具链路展示”有一套一致默认，同时允许宿主替换视觉与内容策略。  
**Alternatives:** 把 tool card 的内容放进 `sharedState.ui`（会把展示层协议化，成本更高）。

### 4) 默认样式与现有 UI kit 一致：tokens + fallback

**Decision:** Thread Kit 组件沿用 UI kit 现有的 tokens 策略（`var(--rivu-*, fallback)`）实现基础视觉，避免引入额外 CSS 框架依赖。  
**Why:** Thread Kit 的职责是“结构与默认体验”，主题仍由宿主决定。  
**Alternatives:** 绑定 Tailwind/shadcn 或 MUI（与“低侵入”冲突）。

## Risks / Trade-offs

- [组件膨胀] Thread Kit 可能让 `rivu-react` 体积增长 → 通过“可选导出 + 无强依赖 + 组件可拆用”控制；并在文档中强调 Layer 2 可选。
- [展示策略分歧] tool args/result 的展示格式在不同宿主差异大 → 通过 slots 提供替换点，并保持默认实现尽量中性（纯文本/折叠）。
- [与 render hooks 重叠] message/markdown/linkifier 等扩展点在另一个 change 中更合适 → 本变更只提供 slots，render hooks 作为后续能力在专门的 change 中补齐。

