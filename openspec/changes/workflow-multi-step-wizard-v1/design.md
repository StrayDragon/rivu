## Context

Rivu 的 workflow 组件要求：
- server-authoritative state（仅在收到服务端 envelopes 后更新）
- 幂等（`clientRequestId`）
- 并发语义明确（`baseRevision` vs `revision`）
- 可审计（交互事件可关联 thread/run/user）

现有 `ApprovalCard` 与 `FormCard` 提供了单步交互闭环，但多步骤流程仍需要宿主自造状态机。

本变更提供一个最小但可扩展的 `MultiStepWizard@1` 契约，并在 server SDK 给出参考处理器，使行为在 TS/Python/Rust 侧一致。

## Goals / Non-Goals

**Goals:**
- 定义并实现 `MultiStepWizard@1`（stateful）：
  - props 描述步骤与字段结构（复用 FormCard 的 field 形状）
  - state 记录当前步骤、values、errors、status 等
  - 交互通过 `ui.v1.event` 回传，并由服务端 `STATE_DELTA` 回写 state + revision
- 提供最小事件集合（固定且可校验）：
  - `wizard.setField`
  - `wizard.next`
  - `wizard.prev`
  - `wizard.submit`
  - `wizard.reset`
- Python/Rust SDK 提供内置处理器：
  - schema 校验
  - idempotency（clientRequestId）
  - optimistic concurrency（baseRevision）
  - 输出 targeting `/ui/components/<id>/state` 与 `/revision` 的 patch ops
- Demo 跑通 round-trip 回归链路（含 revision 冲突与幂等重试用例）。

**Non-Goals:**
- 不在 v1 做自动合并（无 CRDT）；冲突策略以 revision 拒绝为准。
- 不定义“工具执行映射”的强规范：wizard 的 submit 触发哪些 tool 由宿主/编排决定；SDK 仅提供状态更新与可选的 effect 标记（如需要可在后续 change 引入）。
- 不支持文件上传（由 `workflow-file-upload-card-v1` 单独变更处理）。

## Decisions

### 1) Props 复用 FormCard field schema，避免两套表单 DSL

**Decision:** `MultiStepWizard@1` 的 step fields 复用 `FormCard` 的 field 结构（`id/label/type/required/placeholder/options`）。  

**Why:** 表单字段的校验与渲染语义应保持一致，降低学习成本与实现重复。

### 2) State 仅承载 server-authoritative 的业务状态

**Decision:** wizard 的 persisted state 只包含需要回放/审计/一致性的字段（values/errors/currentStep/status/disabled），本地仅保留瞬时 UI 体验状态（hover/focus 等）。

**Why:** 回放一致性要求 persistedState 可重建；体验态不应污染协议状态。

### 3) 事件集合固定，payload 严格可校验

**Decision:** `eventName` 限定为 5 个固定值；每个 event 的 payload shape 固定：
- `wizard.setField`: `{ fieldId: string, value: string|number|null }`
- `wizard.next`: `{}`
- `wizard.prev`: `{}`
- `wizard.submit`: `{}`
- `wizard.reset`: `{}`

**Why:** 固定集合便于跨语言 validators 与 processors 一致实现，也便于做安全 limits/policy。

## API Shape (v1)

- `type = "MultiStepWizard"`
- `schemaVersion = 1`

Props（概念形状；以 `rivu-ui-spec` 的 zod schema 为准）：
- `title: string`
- `description?: string`
- `submitLabel?: string`
- `steps: Array<{ id: string; title: string; description?: string; fields: FormField[] }>`（min 1）

State（概念形状；以 `rivu-ui-spec` 的 zod schema 为准）：
- `currentStepId: string`
- `values: Record<string, string|number|null>`
- `errors?: Record<string, string>`（按 fieldId）
- `disabled?: boolean`
- `status?: "idle"|"submitting"|"submitted"|"error"`

## Server-side processing (reference)

处理器对每次 `ui.v1.event` 必须执行：
1) 校验 event schema（component type + eventName + payload）
2) 幂等：按 `clientRequestId` 去重（重复请求返回同一结果）
3) 并发：检查 `baseRevision` 与当前 `revision` 一致，否则拒绝
4) 状态更新：输出 patch ops 更新 `state` 并递增 `revision`

## Migration Plan

1) `rivu-ui-spec`：新增 Wizard props/state schema + vectors。  
2) `rivu-react`：实现组件与 registration，并在 demo 中挂载展示。  
3) `python/` 与 `crates/`：增加 wizard processor 与单测（含幂等/冲突）。  
4) docs：补齐集成指南与审计/工具边界说明。  
