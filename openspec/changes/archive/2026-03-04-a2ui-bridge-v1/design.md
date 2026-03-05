## Context

Rivu 的运行时契约以 AG-UI 事件流为核心：服务端输出 `{seq,event}`，前端 kernel 归约为 `sharedState`，其中 `sharedState.ui` 承载可回放 UI（组件 props/state + mounts）。

问题在于：`sharedState.ui` 的形状是为“回放/导出/一致性”设计的，不适合让 LLM 直接生成：
- JSON key 重复多、结构冗长，token 成本高
- 需要精确的 patch/mount/revision 语义，LLM 易产生半对半错的输出
- `componentId` 的稳定性与生命周期管理应由服务端权威处理（而非模型随意编造）

因此需要一个“桥接层”：
- A2UI（Agent-to-UI）回答“UI 长什么样”：更紧凑的组件声明/更新意图
- AG-UI 回答“如何协同工作”：事件流、同步、回放与交互回传

## Goals / Non-Goals

**Goals:**
- 定义 `a2ui.v1` 的紧凑 payload schema（可被 TS/Python/Rust 校验），面向模型输出。
- 在服务端 SDK 中提供 A2UI 编译器：`a2ui.v1` → 受控的 `sharedState.ui` JSON Patch（RFC 6902），用于生成 `STATE_DELTA`（必要时可生成 `STATE_SNAPSHOT`）。
- 保持 server-authoritative：`componentId` 分配、revision 递增、mount 排序等由服务端决定；A2UI 仅提供意图与可选稳定 key。
- 提供跨语言 golden vectors：同一输入在多语言上验证一致，并得到一致的编译语义结果。

**Non-Goals:**
- v1 不把 A2UI 直接暴露给浏览器（浏览器只消费 AG-UI 事件与 `sharedState.ui`）。
- v1 不定义复杂的 UI diff/布局系统（只覆盖组件声明、挂载、props/state 更新的最小闭环）。
- v1 不引入图表/表格数据引用（datasets/dataRef）与交互扩展（过滤/brush 等）——这些留给独立 changes。

## Decisions

### 1) A2UI 采用“操作列表（ops）”而不是要求模型输出完整 `sharedState.ui`

**Decision:** `a2ui.v1` 使用一组受限操作（create/update/mount/unmount/remove）来表达变更，而不是让模型输出全量 `sharedState.ui`。  
**Why:** ops 能显著降低 token，并允许服务端对每个 op 做细粒度校验与降级处理。  
**Alternatives:** 全量输出易错且成本高；直接输出 RFC 6902 patch 对模型过于“低层”且难以安全约束。

### 2) 组件身份：A2UI 使用稳定 `key`，服务端映射到 `componentId`

**Decision:** `a2ui.v1` 允许每个组件使用 `key`（短字符串）作为稳定引用；服务端维护 `key -> componentId` 映射并生成最终 `componentId`。映射以 `threadId` 为作用域并持久化。  
**Why:** `componentId` 属于服务端权威（PRD），但模型仍需要一个可引用的稳定句柄来做增量更新。  
**Alternatives:** 让模型生成 componentId（会漂移/冲突）；每次都重新创建组件（会破坏回放稳定性与 mount 引用）。

### 3) 编译器输出受控 JSON Patch，并可附带 warnings

**Decision:** 编译器输出 RFC 6902 patch ops（用于 `STATE_DELTA`），并提供 warnings（例如未知组件类型、无效 mount slot、数据超限等）。  
**Why:** patch ops 是与 kernel/协议对齐的最小通用输出；warnings 允许服务端在不 crash 的情况下做可观测降级。  
**Alternatives:** 直接抛异常会让整体 UI 生成链路更脆；直接生成 `STATE_SNAPSHOT` 会导致 payload 膨胀。

### 4) 明确 limits：把 A2UI 输入当作不可信

**Decision:** `a2ui.v1` decode/compile MUST 支持 limits（max bytes, max depth, max ops, max mounts/component 等），超限即拒绝或降级。  
**Why:** A2UI 来自模型/外部输入，本质不可信；需要与 `ui.v1.event` 同等级的防护。  
**Alternatives:** 仅依赖业务层防护会导致安全与稳定性不可控。

### 5) Golden vectors：以“语义等价”对齐跨语言实现

**Decision:** vectors 同时包含：
- valid/invalid A2UI payload
- 编译后的 patch ops（或可比较的中间表示）
- 关键边界（空 ops、重复 key、未知组件、超限）

并要求 TS/Python/Rust 对同一输入做出一致结论。  
**Why:** A2UI 是跨语言的契约，必须避免“某语言接受、另一语言拒绝”的分裂。  
**Alternatives:** 仅写文档无法保证长期一致性。

## Risks / Trade-offs

- [状态映射复杂] `key -> componentId` 映射需要持久化策略 → v1 要求按 `threadId` 维度持久化映射（实现可用内存缓存 + 可选落库），并在 spec 中定义最小一致性要求。
- [过度设计风险] A2UI 容易演变成“通用 UI DSL” → v1 强约束 ops 集合与字段，先覆盖 Rivu 组件库闭环。
- [调试成本] 编译失败难定位 → 输出结构化 errors/warnings，并建议配合 `ProtocolInspector` 与日志记录原始 A2UI 输入。
