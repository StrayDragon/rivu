## Why

Workflow（Zirvox）场景不仅需要单步交互（`ApprovalCard`/`FormCard`），还经常需要**多步骤的受控流程**：例如开户/退款/配置变更/部署审批等，往往包含：
- 多个步骤的字段采集
- 逐步校验与禁用/回显
- 明确的并发语义（revision）与幂等（clientRequestId）
- 可审计：每一步是谁点的、何时提交、提交了哪些值

如果仓库缺少一个标准化的 Wizard 组件，宿主会重复造“步骤条 + 表单 + 状态机 + 事件上报”，并且很容易在并发/幂等/审计字段上实现不一致。

本变更引入 `MultiStepWizard`：一个 **server-authoritative、可回放、可导出、可审计** 的 workflow 组件契约，并在 Python/Rust SDK 提供参考处理器以保证行为一致。

## What Changes

- 新增 workflow 组件：
  - `MultiStepWizard`（`schemaVersion=1`，stateful）
  - 通过 `CUSTOM(name="ui.v1.event")` 回传最小事件集合（`wizard.setField/next/prev/submit/reset`）
  - 服务端以 `STATE_DELTA` 回写 wizard state 并递增 `revision`（optimistic concurrency）
- `rivu-ui-spec` 补齐 props/state schema + golden vectors（用于跨语言一致校验）。
- `rivu-react` UI kit 实现 + registry registration（tokens + overrides 入口）。
- Server SDK 增强：
  - Python/Rust SDK 提供内置 wizard 事件校验与处理器（idempotency + baseRevision + patch ops 输出）
- 示例与文档：
  - `examples/rivu-react-demo` 增加 Wizard 页，跑通 round-trip 回归链路
  - docs 增加 Wizard 集成与后端处理建议（审计字段落点、与 tool 执行边界）

## Capabilities

### New Capabilities

- `workflow-wizard`: 定义 `MultiStepWizard@1` 的契约（props/state schema、事件集合、server-authoritative round-trip 与降级策略）。

### Modified Capabilities

- `server-sdk-python`: 增加内置 `MultiStepWizard` 事件处理器（校验 + 幂等 + revision + patch ops 输出）的规范性要求。
- `server-sdk-rust`: 同步增加内置 `MultiStepWizard` 事件处理器的规范性要求。

## Impact

- `packages/rivu-ui-spec`: 新增 Wizard 的 schema + vectors；更新 JSON schema 生成与测试。
- `packages/rivu-react`: 新增 `MultiStepWizard` 组件与 registration；接入 tokens 与 overrides。
- `python/`: 增加 Wizard processor（与现有 `ui.v1.event` 处理体系对齐）；补齐测试用例。
- `crates/rivu-server-sdk`: 同步增加 Wizard processor；补齐测试用例。
- `examples/rivu-react-demo`: 新增 Wizard 回归页与 mock-server 处理链路。
- `docs/`: 增加 Wizard 使用指南与后端边界说明（不在浏览器执行副作用工具）。
