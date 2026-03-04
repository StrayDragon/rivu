## Why

Workflow（Zirvox）场景的核心是“读写交互为主、server-authoritative、可审计、幂等/并发语义明确”。目前 Rivu 已具备 `ApprovalCard` 与 `FormCard` 的 round-trip 闭环，但 PRD 中同样被视为 P0 的两类常见交互仍缺失：

- **ConfirmCard**：危险操作二次确认（必须走后端工具执行与审计链路）
- **TaskStatusCard**：展示长任务状态（由后端持续推送 state/tool 结果）

缺少它们会迫使宿主重复造“确认弹窗/卡片”与“任务状态条/卡片”，并且容易在幂等、revision、与审计字段上各自实现不一致。

## What Changes

- 在 `rivu-react` workflow UI kit 中新增：
  - `ConfirmCard`（stateful）：用户确认/取消 → 发送 `ui.v1.event` → 后端处理 → `STATE_DELTA` 回写状态与 revision
  - `TaskStatusCard`（stateless）：展示任务状态/进度/消息（由后端通过 `STATE_DELTA` 更新 props 或组件条目）
- 为两类组件定义最小 schemaVersion + props/state schema 与标准 eventName 集合，并在 demo/mock server 中提供可运行的 round-trip 验收链路。
- 后端 SDK 更新：
  - Python/Rust 的 `UiV1EventProcessor` 补齐对 `ConfirmCard` 的事件处理（并保持 idempotency + revision 冲突语义）
  - `TaskStatusCard` 作为展示组件不新增交互处理器，但补齐 patch helpers/示例以便服务端更新其状态
- 文档与示例更新：新增两类组件的集成指南与建议的审计字段落点（不把审计写入前端）。

## Capabilities

### New Capabilities

- `workflow-cards`: 定义 ConfirmCard 与 TaskStatusCard 的最小契约（schema、事件、server-authoritative round-trip 与降级策略）。

### Modified Capabilities

- (none)

## Impact

- `packages/rivu-react`: 新增 workflow UI kit 组件与 registry registrations；更新 demo fixtures 渲染新组件。
- `python/src/rivu_server_sdk`: 扩展 `UiV1EventProcessor` 以处理 `ConfirmCard` 的事件与 revision 递增；补充示例与测试用例。
- `crates/rivu-server-sdk`: 同步扩展 Rust `UiV1EventProcessor`；补充测试用例。
- `examples/rivu-react-demo`: 增加 ConfirmCard/TaskStatusCard 的展示与交互回归页。
- `docs/`: 补齐 workflow 组件的使用与后端处理建议。

