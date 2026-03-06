# MultiStepWizard (Workflow)

`MultiStepWizard@1` 是一个 **stateful、server-authoritative** 的 Workflow 组件：前端只发送 `ui.v1.event`，服务端负责校验/鉴权/幂等/并发控制，并通过 `STATE_DELTA` 回写 `sharedState.ui.components[componentId].state` 与递增 `revision`。

## Props（`schemaVersion: 1`）

- `title: string`
- `description?: string`
- `submitLabel?: string`
- `steps: Array<{ id: string; title: string; description?: string; fields: FormField[] }>`（至少 1 个 step）

其中 `fields` 复用 `FormCard` 的字段形状（概念）：

- `id: string`
- `label: string`
- `type: "text" | "textarea" | "number" | "select"`
- `required?: boolean`
- `placeholder?: string`
- `options?: Array<{ label: string; value: string }>`（当 `type="select"` 时必须提供）

## State（server-authoritative）

Wizard 的可回放状态由服务端维护并回写：

- `currentStepId: string`
- `values: Record<string, string | number | null>`
- `errors?: Record<string, string>`（按 `fieldId`）
- `disabled?: boolean`
- `status?: "idle" | "submitting" | "submitted" | "error"`

说明：
- 前端渲染以 `state` + `revision` 为真值；本地只允许保留瞬时体验态（如输入框焦点/hover）。
- `state` 采用 passthrough 策略，允许宿主按需扩展额外字段（见“审计字段建议”）。

## 交互事件（固定集合）

前端 MUST 发送 `CUSTOM(name="ui.v1.event")`，并携带：
- `clientRequestId`（用于幂等重试）
- `baseRevision`（用于 optimistic concurrency）

`eventName` 固定为：

- `wizard.setField`：`{ fieldId: string, value: string | number | null }`
- `wizard.next`：`{}`
- `wizard.prev`：`{}`
- `wizard.submit`：`{}`
- `wizard.reset`：`{}`

## 服务端边界（Server Executes Tools）

浏览器端 **不得执行** 任何有副作用的 tools。`wizard.submit` 的语义是“请求提交”，具体触发哪些业务动作（工具调用/写数据库/审批/发消息）由服务端编排决定：

1) 校验 payload + 鉴权  
2) 幂等：按 `clientRequestId` 去重  
3) 并发：检查 `baseRevision` 与当前 `revision` 一致，否则拒绝  
4) 生成 `STATE_DELTA`（JSON Patch ops）更新 `state` 并递增 `revision`

## 审计字段建议（可选扩展）

若需要更强审计（谁在何时提交/提交了什么），建议在服务端：

- 将审计信息写入你的业务日志/数据库（推荐）
- 或将审计字段写入 `state` 的扩展字段（可回放、可导出），例如：
  - `lastEventAtMs`
  - `lastEventBy`
  - `lastSubmittedAtMs`
  - `lastSubmittedBy`
  - `lastClientRequestId`

这些字段不属于 v1 的最小必需字段，但可以在不破坏回放一致性的前提下增强可观测性。

