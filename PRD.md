# PRD：Rivu —— AG-UI Compatible UI Runtime & Component Kit（给 Zirvox / Crystalith 用）

状态：Draft  
更新时间：2026-03-04  
目标：指导实现一套**可交互的“生成式 UI”组件库 + 运行时**，以 **AG-UI 协议**作为事件流标准；可接入 React / Svelte / Vue / Angular 等主流 UI 框架（通过“框架无关内核 + 薄适配层”）；并支持后端 Python / Rust 发事件、做重放与快照。

> 备注（clean-room）：本 PRD 允许“参考 Tambo 的 UI/交互设计模式与产品体验”，但**不复制其源码**。Tambo 仅作为 UX/交互范式参考来源之一。

---

## 0. Meta（命名与路径约定）

### 0.1 命名与定位（Rivu 是什么）

Rivu 的定位是：**像水一样可渗透、可塑形的 UI runtime** —— 你可以把它嵌入任何现有 UI 框架/设计系统中，而不是为了用它去“重写你的应用外壳”。

一句话：
- **AG-UI 负责“事件语义标准”**（你不再自造协议）
- **Rivu 负责“产品级可用的 UI runtime + 组件 kit”**（断线续传、快照回顾、导出、交互回传、权限与幂等等）

### 0.2 仓库与包命名建议（推荐默认）

推荐把 GitHub 仓库直接命名为：`rivu`（monorepo）。

原因：
- repo 名=产品名（最常见的开源/内部工程命名习惯）
- monorepo 能容纳 `rivu-kernel / rivu-react / rivu-svelte / rivu-server-sdk-* / spec` 等多包产物
- 宿主项目（Zirvox/Crystalith）只需要按需依赖其中 1~2 个包，而不是整套“框架”

包名建议（示例，用你们的 org scope 替换）：
- npm：`@<org>/rivu-kernel`、`@<org>/rivu-react`、`@<org>/rivu-svelte`
- PyPI / crates.io：如果要公开发布，名字是全局唯一的（需要单独检查）；如果只内用则按你们发布渠道规则即可

### 0.3 路径约定（便于在多仓库工作区引用）

本文所有“参考源码路径”都按以下工作区假设书写（你之后移动本文件时只需要整体替换前缀）：

- `../tambo`：参考项目（Tambo UI/交互范式，不复制代码）
- `../zirvox`：宿主应用工作区（包含 Zirvox 与 Crystalith）
  - 如果你实际是两个独立 repo（当前就是这种情况）：Zirvox 在 `../zirvox`，Crystalith 在 `../crystalith`，则把文中 `../zirvox/crystalith/...` 替换为 `../crystalith/...` 即可。

---

## 1. 背景与问题（Why now）

### 1.1 现状痛点

- Zirvox 与 Crystalith 都已经有自己的对话 UI 与后端编排，但协议形态不统一（WS delta/final vs SSE + 自定义 envelope）。
- 想接入“可交互的生成式 UI”（表格/图表/表单/审批卡片等）时，通常会出现：
  - UI 组件无法与对话流状态对齐（断线、刷新、多端一致性问题）
  - 工具执行与权限边界不清（前端执行工具风险高）
  - 组件 state 与后端同步机制缺失（导致交互不可恢复、不可审计）
- Tambo 的 UI 体验与组件范式不错，但其组件往往依赖自身 Provider / hooks；直接“拿来集成”会引入链路耦合。

### 1.2 目标方向

用 AG-UI 作为“事件语义与互操作层”，把聊天/工具/组件/状态的增量更新统一进事件流；再围绕“断线续传、存储/快照、安全策略、组件 registry、交互回传”补齐产品级能力。

---

## 2. 目标与非目标（Goals / Non-goals）

### 2.1 Goals（必须实现）

G1. **协议层标准化**：前后端以 AG-UI 事件作为 wire format；支持 `CUSTOM` 事件承载 UI 交互扩展。  
G2. **断线续传**：支持 `seq + resumeFrom`（SSE 的 `id` / `Last-Event-ID` 或 WS wrapper），断线可继续流式、不重复、不乱序。  
G3. **可交互 UI**：支持 “server-authoritative state”（组件 state 后端权威），前端仅展示与上报交互。  
G4. **跨框架**：提供 framework-agnostic kernel（状态机 + reducer + outbox），再提供 React/Svelte 适配层。  
G5. **跨语言后端**：Python / Rust 能“稳定地”编码、校验、重放、发出 AG-UI 事件流；并能处理 `ui.v1.event` 交互输入。  
G6. **安全边界清晰**：工具后端执行（鉴权/限流/审计/幂等），前端不直接执行有副作用的 tool。

### 2.2 Non-goals（v1 不做）

- 不做完整 LLM Orchestrator/Agent 框架（你们已有）。
- 不做通用 CRDT 协同编辑（v1 只做锁/租约或 revision 冲突）。
- 不保证“所有第三方 AG-UI 客户端无缝兼容我们的 UI 扩展”（扩展是可选的）。

---

## 3. 参考与依赖（Ecosystem Research）

### 3.1 直接复用的 AG-UI SDK（不要重复造轮子）

- TypeScript：
  - `@ag-ui/core`（事件类型 + runtime schemas）
  - `@ag-ui/client`（客户端能力与协议工具）
  - `@ag-ui/encoder`、`@ag-ui/proto`（编码/序列化相关）
- Python：
  - `ag-ui-protocol`（Pydantic 模型 + 编码/解码）
- Rust（现状：社区实现为主，需评估成熟度/补齐缺口）：
  - `syncable-ag-ui-core` / `syncable-ag-ui-server`（docs.rs 可用）

参考链接：
- AG-UI Docs：https://docs.ag-ui.com
- AG-UI Repo：https://github.com/ag-ui-protocol/ag-ui
- npm：`@ag-ui/core` https://www.npmjs.com/package/@ag-ui/core
- npm：`@ag-ui/client` https://www.npmjs.com/package/@ag-ui/client
- npm：`@ag-ui/encoder` https://www.npmjs.com/package/@ag-ui/encoder
- npm：`@ag-ui/proto` https://www.npmjs.com/package/@ag-ui/proto
- PyPI：`ag-ui-protocol` https://pypi.org/project/ag-ui-protocol/
- docs.rs：`syncable-ag-ui-core` https://docs.rs/syncable-ag-ui-core/latest/syncable_ag_ui_core/
- docs.rs：`syncable-ag-ui-server` https://docs.rs/syncable-ag-ui-server/latest/syncable_ag_ui_server/

> 结论：**AG-UI core 事件的 parse/validate/encode**优先用官方 SDK（TS/Python）与社区 crate（Rust）；我们主要做差异化：seq/resume/store/policy + UI 扩展 spec + UI 组件库。  
> Zirvox/Crystalith 的“适配代码”应放在各自宿主项目里（本仓库只提供内核/组件/规范与集成指南）。

### 3.2 协议信任模型

- AG-UI 协议可以信任为“语义标准与互操作目标”，但**不能当作输入可信**：所有事件与 custom payload 都必须校验与限流。  

---

## 4. 产品形态（我们最终交付什么）

### 4.0 “像水一样”的集成哲学（避免成为另一个难集成的框架）

Rivu 必须满足的集成体验（硬约束）：

1) **Headless-first**
- `rivu-kernel` 不依赖 React/Svelte/Vue/Angular
- 内核只暴露：`dispatch(event)` / `sendAction(action)` / `getState()` / `subscribe(listener)`（以及必要的 selectors 工具）

2) **零强制 Provider**
- React/Svelte 适配层可以提供 Provider/hook/store，但必须是“可选糖”
- 所有 UI 组件必须支持“直接传入 kernel/registry”的用法，不能强绑 Context

3) **可渐进采用（Adoption Ladder）**
- Level 0：只用 `rivu-ui-spec`（schema + golden vectors），后端先规范化输出
- Level 1：只用 `rivu-kernel`（把事件流变成状态），UI 继续用宿主应用现有组件渲染
- Level 2：只引入 `rivu-*` 的富 UI 组件（例如表格/图表/表单），嵌入到你现有 Chat UI 中
- Level 3：引入完整的 Thread UI kit（仅对“从零做新 UI”有意义）

4) **“可微调”优先于“强风格”**
- 组件外观必须可覆盖：className/slots/渲染函数覆盖（不要封死 DOM 结构）
- 提供 theme tokens（CSS variables 或 design tokens），能融入宿主的 Tailwind/shadcn/自研设计系统
- 所有状态/数据来自 kernel，不要在 UI 内部偷存“协议状态”

5) **Fail-fast & 可观测**
- 事件/schema 不匹配直接报错（可配置“开发态 throw / 生产态降级为 UnknownComponent”）
- 必须提供可选的 Protocol Inspector（显示 seq、event types、state snapshot）

#### 4.0.1 具体“解耦点”（对照 Tambo 的耦合来源）

Rivu 要刻意避免的“集成地狱”主要来自：**UI 组件自己去依赖一个全局对话 Provider**。Tambo 的一些入口文件很直观地体现了这种耦合（只用于对照，不复制）：
- 输入框入口依赖 thread/input hooks：`../tambo/packages/react-ui-base/src/message-input/message-input-root.tsx`
- thread 渲染入口依赖全局线程上下文：`../tambo/packages/react-ui-base/src/thread-content/root/thread-content-root.tsx`
- tool call/result 的关联查找依赖全局 state：`../tambo/packages/react-ui-base/src/toolcall-info/root/toolcall-info-root.tsx`

Rivu 的对策（强约束）：
- UI 组件只依赖 **kernel state + 显式 props**（例如 `messageId` / `componentId`），不直接依赖“线程管理 API”
- 所有“查找关联关系”（tool result 属于哪个 tool call、组件挂载在哪条消息上）都由 **kernel reducer** 产出结构化 state，UI 只负责渲染

#### 4.0.2 可定制模型（“像水”=允许宿主塑形）

Rivu 的 UI 必须提供 3 个层级的定制能力（否则必然融不进现有系统）：

1) **Theme tokens（全局）**
- 用 CSS variables 或 token 对象描述：颜色/圆角/间距/字体/阴影
- 允许宿主直接复用自己的 design tokens（不要求引入 Tailwind/shadcn）

2) **Slots / Overrides（组件级）**
- 每个复杂组件提供 `slots`（子组件覆盖）与 `slotProps`（子组件 props 注入）
- 典型例子：`DataTable` 的 `Toolbar`、`Cell`、`EmptyState`、`Pagination` 可替换

3) **Render hooks（数据级）**
- 允许宿主注入 formatter（数字/日期/货币）、linkifier、markdown renderer、代码高亮器
- 允许宿主在渲染前拦截并“净化” props（防止模型输出危险 HTML/URL）

### 4.1 产物（Packages）

1) `rivu-kernel`（framework-agnostic）
- 输入：AG-UI event stream（SSE/WS），外加 transport 元信息（`seq`）
- 输出：可订阅 state、selectors、以及 `sendAction()`（交互 outbox）

2) `rivu-ui-spec`（语言无关 spec + test vectors）
- 定义：`ui.v1.*` custom event schemas（至少 `ui.v1.event`）
- 定义：UI state shape（建议挂在 AG-UI shared state 下：`state.ui`）
- 提供：golden vectors（跨 TS/Python/Rust 一致性测试）

3) `rivu-react` / `rivu-svelte`（官方适配层）
- registry：`componentType -> renderer`
- 适配：React hooks（`useSyncExternalStore`）；Svelte store（`readable`）
- 组件库：基础消息/工具卡片 + 生成式 UI 组件（表格/图表/表单等）
  - 其他框架（Vue/Angular/Solid 等）：v1 不一定提供官方包，但必须能用 `rivu-kernel.subscribe()` 做薄绑定

4) `rivu-server-sdk-python` / `rivu-server-sdk-rust`（后端侧 SDK，不是独立服务）
- 事件编码（SSE `id: seq`）、重放、快照生成、幂等/并发控制辅助
- `ui.v1.event` 输入校验（schema + 限流）
- 默认实现 **不依赖外部服务**（dev/小场景用 in-memory / SQLite / 文件实现即可）；Redis/Postgres 等作为可选 adapter
  - v1 必备默认实现：`InMemoryEventStore` + `SqliteSnapshotStore`（或同等能力的本地持久化实现）

### 4.2 使用画像（两个“产品 profile”，分别服务 Crystalith / Zirvox）

你已经明确两边侧重点不同，因此在设计上直接把它产品化成两个 profile（同一套 kernel + 不同组件集与默认存储策略）：

#### 4.2.1 组件分层（让它“像水一样”可嵌入）

为了避免“引入组件库=必须重写整个聊天 UI”的灾难，Rivu 的 UI 必须按层拆开：

- **Layer 0：Kernel-only（无 UI）**
  - 只提供状态（messages/tools/state.ui）与 action/outbox
  - 宿主应用可以继续用自己的 Chat UI，仅把富组件渲染出来
- **Layer 1：Render Primitives（薄 UI 外壳，可被宿主替换）**
  - `ComponentRenderer`：按 `componentId/componentType` 渲染组件
  - `ToolCallCard/ToolResultCard`：tool 事件的展示组件（可替换）
  - `UnknownComponentCard`：未知组件/版本不匹配的降级 UI
  - `ProtocolInspector`（开发态）：显示 `seq`、event、state 快照
- **Layer 2：Thread UI Kit（可选，不强绑）**
  - `ThreadView/MessageList/MessageBubble/ScrollableContainer/RunStatus` 等“外壳组件”
  - 只为“新项目快速起步”服务；**老项目默认不需要引入**

**Profile A：Viewer（Crystalith）**
- 场景：引用/报表/统计化展示（表格/图表/摘要卡片），**只读为主**
- 关键要求：
  - 历史可回顾：组件 props 必须可持久化并可重放
  - 可导出：至少支持导出为“结构化 JSON 快照”（后续可扩展 HTML/PDF）
  - 长期稳定：组件 schema 需要版本化（避免半年后回放渲染炸）；至少要做到“旧版本可 decode 或可降级展示”
- 默认策略：
  - 组件以 `Stateless` 为主（或 `Stateful` 但禁用交互写入）
  - 存储以 DB/文件快照为主（dev 默认 SQLite/文件；短期重放 dev 默认 in-memory；prod 可选 Redis）
  - 导出以“快照优先”（`STATE_SNAPSHOT` + `state.ui`）为准，而不是重放全量事件

v1（Viewer）P0 组件清单（全部 stateless，可回放/可导出）：
- `ReportSection`：标题/描述/容器（用于“报表式”排版）
- `MetricCard`：关键指标卡（数值 + 变化率 + 口径说明）
- `DataTable`：表格（支持列定义、对齐、格式化；导出 CSV 可选）
- `BarChart` / `LineChart`：基础图表（只吃 props 数据，不做外部请求）
- `CitationList`：引用/来源列表（用于回顾与导出一致性）
- `UnknownComponentCard`：未知组件降级（展示 `componentType`、版本、raw props 摘要）

v1（Viewer）P1（非必须，但建议规划）：
- `PivotTable` / `Heatmap`：更复杂报表组件
- `DiffView`：对比/变化展示（适合“本次 vs 上次”报告）
- `ExportMenu`：导出（JSON 快照必做；HTML/PDF 后续）

**Profile B：Workflow（Zirvox）**
- 场景：授权/审批/表单填写/级联操作，**读写交互为主**
- 关键要求：
  - 交互必须可审计：谁点了什么、触发了什么 tool、结果是什么
  - 幂等：断线重试不会重复执行 tool
  - 并发语义明确：revision 冲突要么拒绝，要么锁（v1 不做自动合并）
- 默认策略：
  - 组件以 `Stateful` 为主（server-authoritative state）
  - 存储采用“热重放 + 冷持久”的分层（dev 默认 in-memory/SQLite；prod 可选 Redis + Postgres），尤其是 tool 与关键 state

v1（Workflow）P0 组件清单（至少 1 个强 stateful，必须 round-trip）：
- `ApprovalCard`（stateful）：允许/拒绝（必须走 `ui.v1.event` → 后端 → `STATE_DELTA` 回写）
- `FormCard`（stateful）：表单填写/提交（字段校验错误可回显；支持 disabled/pending）
- `ConfirmCard`（stateful 或 stateless+action）：危险操作二次确认（强制后端 tool 执行）
- `TaskStatusCard`（stateless）：展示长任务状态（由后端持续推送 tool result/state delta）

v1（Workflow）P1（后续增强）：
- `MultiStepWizard`：多步骤向导（强 revision 语义）
- `FileUploadCard`：文件/附件（注意：实际上传仍需宿主处理或后端签名 URL）

### 4.3 参考 Tambo 的范围（不复制代码，只参考体验/交互范式）

可参考的“范式”示例（纯产品/交互层面）：
- 组件 registry（白名单）+ schema 驱动渲染
- 组件 props/state 的增量更新（patch 思路）
- 交互事件统一上报，后端决定是否触发工具与如何更新 UI
- UI 展示：message list、tool call/result 卡片、suggestions、输入框布局与可用性

明确不做：
- 不引入 `useTambo()` / Tambo Provider 依赖
- 不复用其内部线程/运行/工具 API 形状

### 4.4 “搬运 Tambo UI” vs “重写”：选项与推荐

你问的“能不能扒 Tambo UI 然后用 AG-UI 重置”——技术上能，但成本主要不在协议，而在**解耦数据层**：

- 选项 A：Fork/Port Tambo UI（快启动，重解耦）
  - 你会做的事：把依赖 Provider/hooks 的组件改成“纯 props 输入 + dispatch(action) 输出”
  - 风险：改动面大（本质接近重写），而且会把你们的 UI API 形状绑到 Tambo 的历史设计上
  - 适用：你们非常认可其 UI 结构，且愿意接受长期维护 fork 的成本
- 选项 B：Clean-room 重写（推荐）
  - 你会做的事：以 Tambo 的 UX/交互为参考，自己定义组件 API 与渲染结构；数据层直接对接 `rivu-kernel`
  - 优点：边界最清晰、长期维护最轻，最符合“给 Zirvox/Crystalith 复用”的目标
  - 适用：你现在的取向（避免纠纷、避免耦合）就是这个

**v1 推荐路线（最短闭环）**：
1) 先实现 kernel（事件流 → state）
2) 先实现 4 个“骨架 UI”组件：ThreadView / MessageList / ToolCards / ComponentRenderer
3) 先实现 1~2 个 stateful 组件（必须能 round-trip）：例如 `ApprovalCard`、`FormCard`
4) 在宿主项目里分别实现 adapter，把现有流式链路接到 `rivu-kernel` 上

---

## 5. 核心用户故事（User Stories）

- U1（终端用户）：对话过程中出现一个“可点击/可填写”的组件（例如表单），我操作后 UI 立即反馈，并且刷新/断线重连后能恢复。
- U2（应用开发者）：我注册一个 `componentType`，后端发事件即可在 UI 渲染出来；交互回传也有统一入口。
- U3（平台/安全）：所有工具调用都在后端执行且可审计；前端无法绕过权限直接触发敏感工具。
- U4（多端用户）：同一 thread 在两个浏览器同时打开，状态更新有明确冲突语义（可接受 LWW 或 409）。

---

## 6. 协议与状态模型（Contract）

### 6.1 Transport 顺序与续传（`seq + resumeFrom`）

AG-UI 事件本身不强制携带 `seq`，因此顺序/续传由 transport 提供：

- SSE：
  - `id: <seq>`（单调递增）
  - `data: <agui-event-json>`
  - 重连：客户端带 `Last-Event-ID: <seq>` 或 `?resumeFrom=<seq>`
- WebSocket：
  - wrapper：`{"seq":123,"event":{...AgUiEvent}}`
  - 重连：握手发送 `resumeFrom`

客户端规则（fail-fast）：
- `seq == lastSeq + 1`：apply
- `seq <= lastSeq`：丢弃（重放重复）
- `seq > lastSeq + 1`：gap → 触发 resync（请求快照或从 event store 补发）

### 6.2 ID 归属（权威在哪里）

| 标识 | 推荐归属 | 理由 |
|---|---|---|
| `threadId` | 后端 | 资源/权限/审计 |
| `runId` | 后端 | 编排/可追踪/可重放 |
| `messageId` | user：前端；assistant：后端 | user 需乐观+幂等；assistant 需一致重放 |
| `toolCallId` | 后端 | 安全边界 + 审计 |
| `componentId` | 后端（AI/编排创建） | 后续 patch/state/toolResult 引用稳定 |

强制新增：`clientRequestId`（前端生成）
- 每次 `sendMessage` / `ui.v1.event` 都必须带，后端据此去重（幂等）。

### 6.3 UI state：建议放进 AG-UI shared state（`state.ui`）

推荐 v1 state shape（示意）：

```ts
state.ui = {
  v: 1,
  components: {
    [componentId]: {
      type: "DataTable" | "RefundForm" | ...,
      schemaVersion: 1,       // 组件 schema 版本（Viewer profile 强依赖：用于历史回放/导出稳定）
      props: {...},          // server-owned
      state: {...},          // server-owned persistedState（B）
      revision: 12,          // 并发控制（etag/revision）
      mounts: [{ messageId, slot: "inline" | "sidebar", order: 0 }]
    }
  }
}
```

> 说明：把 UI tree 放 shared state 的好处是：`STATE_SNAPSHOT/STATE_DELTA` 天然就能做恢复与重放；不需要额外定义“组件挂载事件”才能恢复 UI。

### 6.4 Stateless vs Stateful（组件粒度：设计期必须决定）

- Stateless Component（永远 A 为主）
  - 不定义可同步 state
  - 仅吃 props；体验类 UI state（展开/hover）留在本地
- Stateful Component（B 为主）
  - 明确定义 state schema，并要求后端权威、可恢复
  - 建议把 state 拆为：
    - `persistedState`（B）：影响业务/工具/恢复
    - `ephemeralState`（A）：纯体验字段

### 6.5 交互回传：`CUSTOM(name="ui.v1.event")`

前端 → 后端（最小必需字段）：

```json
{
  "type": "CUSTOM",
  "name": "ui.v1.event",
  "value": {
    "componentId": "cmp_...",
    "eventName": "submit" ,
    "payload": { "...": "..." },
    "clientRequestId": "req_...",
    "baseRevision": 12
  }
}
```

后端处理：
1) 鉴权（thread/component/action）
2) schema 校验（payload）
3) 幂等去重（clientRequestId）
4) 并发控制（baseRevision vs current revision）
5) 输出：
   - `STATE_DELTA`（更新 `state.ui.components[componentId]`）
   - 必要时输出 tool 相关 AG-UI 事件（`TOOL_CALL_*` / `TOOL_RESULT`）

---

## 7. 事件存储与快照（断线体验的根）

目标：既要“断线 30 秒续上”，又要“刷新后可恢复”，并且别把 DB 写爆。  
约束：**Rivu 的 SDK 默认不要求 Redis/Postgres 这类外部服务**（dev/小场景应当用 in-memory / SQLite / 文件方案即可跑通）。

### 7.1 三种存储形态（带具体例子）

#### A) DB event store（强：审计/回放/分支）

适用例子：
- 你要可审计：谁触发了哪个 tool、参数是什么、结果是什么
- 你要 debug：回放某次 run 的完整事件序列

实现例子（Postgres）：
- 表 `agui_events(thread_id, seq, run_id, event_type, event_json, created_at)`
- 补发：`SELECT ... WHERE thread_id=? AND seq>? ORDER BY seq`
- 快照表 `agui_snapshots(thread_id, run_id, seq, snapshot_json, created_at)`

风险：如果把 token 级 delta 都落库，写放大很严重 → 必须做 server-side flush/compaction。

#### B) In-memory ring-buffer（默认：零外部依赖，解决短期断线）

适用例子：
- 你只保证“短期断线续上”（例如 30 秒内），历史只需要最终结果（最终 messages + 最终 state）
- 单机/单进程部署（或你愿意接受“进程重启就无法从 ring-buffer 补发”）

实现例子：
- 每 thread 一个 ring-buffer：保留最近 `N` 个 envelope（`{seq,event}`），超出丢弃最老
- 断线补发：从 `seq` 往后读；读不到就回退到快照（SQLite/文件快照亦可）

#### B2) Redis ring-buffer（可选 adapter：高并发/多实例）

适用例子：
- 多实例横向扩展，需要共享“短期重放窗口”
- 你不想让“某个 pod 重启”导致断线补发失败

实现例子：
- Redis Stream/List：`thread:{id}:events`，保留最近 `N` 条或 TTL
- 断线补发：从 `seq` 往后读；读不到就回退到 DB 快照

#### C) 混合（推荐默认）：热重放 + 冷持久（实现可替换）

推荐默认参数（可先用这个起步）：
- 热重放：
  - dev/小场景：in-memory ring-buffer（每 thread `20k`，TTL `15min` 的等价策略由实现决定）
  - prod：可选 Redis ring-buffer（每 thread `20k`，TTL `15min`）
- 冷持久：
  - dev/小场景：SQLite 文件（event store 或 snapshot store 其一即可）
  - prod：Postgres（event store + snapshots）
- 每 run 结束写一次 `STATE_SNAPSHOT`（含 `state.ui`）+ 持久化最终 messages/tool results
- 超长 run：每 `5s` 或每 `1000` 事件补一个快照（上限防爆）

### 7.2 快照频率：用“重放预算”反推

设定 `maxReplayEvents`（例如 1000）：
- 当 `eventsSinceSnapshot > maxReplayEvents` → 写快照
- 关键边界事件也触发快照（强推荐）：
  - 文本消息结束
  - tool call 结束
  - UI 结构变化（组件 mount/unmount 或大 patch）

---

## 8. 多端一致性（并发冲突：给明确语义）

### 8.1 冲突策略选项（带例子）

#### LWW（Last-Write-Wins）：只适合“无业务影响”的 state

例子：`LiveSlider.threshold` 仅影响展示阈值  
两个客户端同时改，后端按到达顺序覆盖即可。

#### revision/etag（推荐默认）：冲突时拒绝或提示刷新

例子：`RefundForm` 会触发退款 tool  
- state 有 `revision=10`
- Client A 提交 `baseRevision=10` 改金额 → 成功，revision=11
- Client B 提交 `baseRevision=10` 改币种 → 后端发现冲突：
  - 返回 409 语义（可发 `CUSTOM(ui.v1.conflict)` 或直接推 `STATE_SNAPSHOT`）

#### 锁/租约：强一致但牺牲并发（v1 可选）

例子：`LongTextEditor` 多人编辑  
没有 CRDT 就做锁：只有 owner 能写，其他只读。

### 8.2 v1 默认建议

- Stateful components 默认用 **revision/etag**（而不是 LWW）
- Stateless components 不进入冲突域（本地体验状态不回传）
- 真正需要多人编辑的组件，先做锁，不做 CRDT

---

## 9. 工具执行与权限（后端执行 ≠ 自动安全）

### 9.1 执行策略（强制）

- 所有有副作用工具（写 DB、发邮件、支付、部署、删文件）必须在后端执行。
- 前端只能上报 `ui.v1.event` 或“发送用户消息”，不能直接执行 tool。

### 9.2 权限分层（从粗到细，v1 先落地前两层）

Level 1：Tool 级 RBAC/ABAC  
Level 2：Thread/Run capability（某些 thread 禁止副作用工具）  
Level 3：Component-action → Tool 映射（最终最稳：只有特定组件 action 才能触发某 tool，参数受限）

### 9.3 审计与幂等（强制）

- 每个 tool call 必须可追踪到触发源：`clientRequestId`、用户、thread/run、componentId/eventName（如有）
- 幂等：相同 `clientRequestId` 重试不会重复执行工具

---

## 10. SDK 与实现策略（框架无关优先）

### 10.1 Kernel（TS）关注点（我们真正要写的）

因为协议 parse/validate 可复用 `@ag-ui/*`，所以 kernel 的关注点是：
- transport 顺序与续传（seq/resumeFrom）
- event apply（reducer）+ selectors
- outbox（action retry + 去重）
- 安全与限制（大小、速率、unknown event/custom name fail-fast）

#### 10.1.1 Kernel API 合同（v1 必须稳定，避免“像框架一样难用”）

Rivu kernel 必须是**可嵌入的库对象**，而不是“必须包一层 Provider 才能用”的框架。

建议最小接口（示意，不要求完全一致）：
- `dispatch(envelope)`：应用一条服务端事件（含 `seq`）
- `getState()`：读取当前状态（messages/tools/state.ui）
- `subscribe(listener)`：订阅状态变化（返回 unsubscribe）
- `send(action)`：发送一个“用户动作”（例如 `ui.v1.event`），由宿主注入的 `actionTransport` 负责真正发到后端

关键约束：
- kernel **不做网络请求**、不绑定 URL/鉴权；只调用你注入的 transport
- kernel **不假设线程 API**；thread/run 的存在通过事件与 state 表达
- 所有 UI 组件都可以通过“传入 kernel 实例”直接工作（Provider 只是一层可选糖）

### 10.2 Python / Rust（后端侧）关注点

- 事件发射（SSE/WS）+ `seq` 分配
- EventStore 接口（默认 in-memory/SQLite/文件；可选 Redis/Postgres adapter）+ replay + snapshot
- `ui.v1.event` 输入校验与并发控制（revision）
- tool policy（权限/限流/审计/幂等）

### 10.3 跨语言一致性：golden vectors（必须做）

- 同一组事件 JSON 在 TS/Python/Rust 都能 parse + validate
- `ui.v1.event` 的 payload 在三端 schema 一致
- SSE 编码/解码一致（`id`、换行、unicode、chunking）

---

## 11. 集成到 Zirvox / Crystalith（迁移最小侵入）

> 重要：本仓库不包含 Zirvox/Crystalith 的适配代码（避免把宿主项目的 API/路由/鉴权耦合进来）。  
> 这里给的是“集成步骤与 adapter 形状”，代码落点应在宿主项目里（参考 Appendix A.2 的路径）。

### 11.1 Zirvox（WS：delta/final/abort）

迁移策略：
1) 写一个临时 adapter：把现有 WS 消息转成 AG-UI 文本事件（start/content/end），并用 wrapper 补 `seq`
2) UI 改为完全 state-driven（不再手搓 assistantDraft）
3) 后端逐步原生输出 AG-UI 事件 + 支持 `resumeFrom`

### 11.2 Crystalith（SSE + 自定义 envelope）

迁移策略：
1) 后端双写一段时间：保留旧 envelope，新增 AG-UI SSE（或扩展同通道）
2) 前端优先消费 AG-UI；旧 envelope 作为短期 fallback（设置删除日期）
3) 把 envelope parts 迁移为：
   - 文本：AG-UI 文本消息事件
   - tool：AG-UI tool call/result 事件
   - UI：`STATE_DELTA` 更新 `state.ui`（或扩展 custom）

---

## 12. 里程碑与验收（MVP 优先）

### R0（选型定稿）
- 确认：wire format 完全采用 AG-UI event
- 确认：`state.ui` shape + `ui.v1.event` schema（不超过 3-5 个 eventName）
- 确认：默认并发策略（revision）与默认存储策略（混合）

### R1（Kernel MVP）
- SSE/WS transport（含 seq/resume）
- reducer + selectors（messages + tools + state.ui）
- outbox（ui.v1.event）+ clientRequestId 幂等

### R2（后端侧 MVP：Python 或 Rust 先选一个落地）
- seq 分配 + replay + snapshot
- 默认落地不依赖外部服务：in-memory ring-buffer + SQLite/文件快照（足够支持 resume/review/export）
- ui.v1.event 处理 + revision 冲突语义
- tool 执行后端化（审计/限流/幂等）

### R3（React/Svelte 其中一个先落地）
- registry + 2~3 个核心组件（建议至少 1 个 stateful）
- demo：组件交互 → tool → state delta → UI 更新

### 验收（DoD）

**Kernel / 协议链路**
- 断线续传：同一 run 继续流式，`seq` 不重复不乱序；出现 gap 自动 resync（replay 或 `STATE_SNAPSHOT`）
- 校验：AG-UI core events + `ui.v1.event`（custom）都做 runtime schema 校验；unknown event/custom name 默认拒绝
- 可观测：能在开发态打开 `ProtocolInspector` 查看 seq、事件类型与当前 `state.ui`（至少能定位“为什么没渲染组件”）

**Workflow（Zirvox 侧重点：读写/级联）**
- Round-trip：至少 1 个 stateful 组件（`ApprovalCard` 或 `FormCard`）完整跑通  
  `ui.v1.event` → 后端鉴权/去重/并发控制 → `STATE_DELTA` 回写 → UI 更新
- 幂等：同一 `clientRequestId` 重试不会重复写 state/重复执行 tool
- 并发：revision 冲突有明确语义（拒绝 + 提示刷新或锁），不做“悄悄覆盖”

**Viewer（Crystalith 侧重点：只读/回顾/导出）**
- 回顾：同一 thread 在刷新/重连后能用 `STATE_SNAPSHOT` 重建 `state.ui` 并稳定渲染
- 导出：至少支持导出“结构化 JSON 快照”（包含 messages + tool results + `state.ui`）并可回放一致
- 兼容：未知组件类型/旧版本 schema 能降级为 `UnknownComponentCard`（不会把整页炸掉）

**集成体验（像水一样）**
- 宿主应用可以只采用 Layer 1（Render Primitives）嵌入到现有 Chat UI，而不需要引入 Thread UI Kit
- UI 组件可被宿主替换/微调（slots/className/theme tokens），不会被强风格绑架

---

## 13. 关键开放问题（需要你拍板）

1) v1 首批 stateful 组件选哪些？（决定 B 的范围与测试用例）
2) 存储策略：v1 默认零外部依赖（in-memory/SQLite/文件）是否足够？生产环境是否允许引入 Redis/Postgres 作为可选 adapter？
3) 冲突语义：revision 冲突时前端 UX（提示/自动刷新/合并）选哪种？
4) UI 扩展范围：v1 只做 `ui.v1.event`（推荐）还是也做 `ui.v1.mount/patch/unmount`？

---

## Appendix A：参考实现索引（只做“设计/交互范式”参考，不复制代码）

> 目的：让实现者在写 `rivu-*` 时能快速对照成熟项目的“模块划分、交互 UX、失败处理”，但不把任何项目的内部耦合（Provider/hooks/API）带进来。

### A.1 `../tambo`（UI/交互范式参考）

**UI 组件组织方式（registry + 组合式组件）**
- `../tambo/packages/ui-registry/src/components/`：UI registry 的组件目录结构（按组件域拆分）
- `../tambo/packages/ui-registry/src/components/message/message.tsx`：消息渲染粒度（可参考“message=容器 + slots”）
- `../tambo/packages/ui-registry/src/components/message-suggestions/message-suggestions.tsx`：suggestions UX（但你们不必实现同款生成策略）
- `../tambo/packages/ui-registry/src/components/scrollable-message-container/scrollable-message-container.tsx`：滚动容器与“自动滚动/停止滚动”的 UX
- `../tambo/packages/ui-registry/src/components/message-thread-full/`：完整 thread UI 的拆分方式（可参考“外壳组件分层”）
- `../tambo/packages/ui-registry/src/components/message-thread-panel/`：侧边 panel 的组织方式（Viewer profile 可参考）
- `../tambo/packages/ui-registry/src/components/form/form.tsx`：表单类交互组件的结构（可参考字段布局与交互反馈）

**“不是纯 UI”的耦合点（你们要避免）**
- `../tambo/packages/react-ui-base/src/thread-content/root/thread-content-root.tsx`：依赖 `useTambo()` 的 thread 渲染入口
- `../tambo/packages/react-ui-base/src/message-input/message-input-root.tsx`：依赖 `useTambo()` / `useTamboThreadInput()` 的输入框入口
- `../tambo/packages/react-ui-base/src/toolcall-info/root/toolcall-info-root.tsx`：tool call/result 的关联逻辑（你们应改成纯 state-driven）

**组件 state 同步与“可交互组件”模式（参考思路）**
- `../tambo/react-sdk/src/v1/hooks/use-tambo-v1-component-state.ts`：组件 state 与服务端同步（debounce、pending、回滚等）
- `../tambo/react-sdk/src/v1/providers/tambo-v1-thread-input-provider.tsx`：输入提交链路与 optimistic UX（清空输入、失败回滚、pending 状态）
- `../tambo/react-sdk/src/providers/tambo-interactable-provider.tsx`：interactable 注册与 tool 映射（你们可参考“白名单 + schema + 事件上报”思路）
- `../tambo/react-sdk/src/hoc/with-tambo-interactable.tsx`：把组件包装成“可被 AI/系统观察/更新”的模式（你们可改为 framework-agnostic registration）
- `../tambo/react-sdk/src/providers/tambo-registry-provider.tsx`：组件 registry 注入方式（Rivu 要做成可选糖）

**文档层面的交互范式说明（参考，不照搬 API）**
- `../tambo/docs/content/docs/guides/enable-generative-ui/register-interactables.mdx`：interactables 的概念与注册方式（对照你们的 `ui.v1.event`/registry）

**事件/patch 聚合（参考实现方法，不照抄）**
- `../tambo/packages/client/src/types/event.ts`：事件类型与 custom event 的形状（对照你们的 `ui.v1.*` schemas）
- `../tambo/packages/client/src/utils/event-accumulator.ts`：增量事件如何累积成可渲染状态（与 AG-UI 的 `STATE_DELTA` 思路互补）

### A.2 `../zirvox`（宿主应用：Zirvox/Crystalith 参考）

> 注意：本文把宿主应用工作区统一叫 `../zirvox`。如果你实际是独立 repo，请按第 0 节替换路径。

**Zirvox（WS 流式：delta/final/abort）**
- `../zirvox/frontend/web/src/pages/ChatPage.tsx`：当前 WS 流式拼接 `assistantDraft` 的方式（适配到 AG-UI 文本事件）
- `../zirvox/sdks/gateway-rpc/src/browser.ts`：`chatTurnStart/chatAbort/chatHistory` 等调用入口（决定你 adapter 的输入形状）
- `../zirvox/frontend/web-legacy/src/routes/chat/+page.svelte`：Svelte 版本的历史实现（对你们未来 Svelte 适配很有参考价值）

**Crystalith（SSE + UI envelope：迁移参考）**
- `../zirvox/crystalith/frontend/web/src/features/workspace/domains/messages/useChat.ts`：SSE streaming 处理（chunk/done）
- `../zirvox/crystalith/frontend/web/src/features/workspace/domains/messages/chatUiEnvelope.ts`：`[[crystalith-ui:v1]]` envelope（迁移目标：替换为 AG-UI events + `state.ui`）
- `../zirvox/crystalith/frontend/web/src/features/workspace/domains/messages/ChatPanel.tsx`：解析 envelope 并渲染（迁移目标：变成纯 state-driven）
- `../zirvox/crystalith/frontend/web/src/features/workspace/domains/messages/chatUiRegistry.tsx`：组件白名单 registry（迁移目标：对齐 `componentType -> renderer` 的统一 registry）
- `../zirvox/crystalith/frontend/web/src/features/workspace/domains/messages/components/ToolActionCard.tsx`：tool UI 的表现层（迁移目标：对接 AG-UI tool events）
- `../zirvox/crystalith/frontend/web/src/features/workspace/shared/tambo/TamboProvider.tsx`：仅 registry 用法（说明“只用 UI registry 不用 provider 全家桶”的价值）
