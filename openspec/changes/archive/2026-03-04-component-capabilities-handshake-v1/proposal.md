## Why

Rivu 的 UI kit 允许宿主裁剪/替换组件 registry，并且不同部署环境（React/Svelte、不同版本）支持的组件与 `schemaVersion` 可能不同。仅靠前端 `UnknownComponentCard` 降级虽然安全，但会造成“服务端生成了 UI、客户端却渲染不出来”的低信任体验，也会浪费 token/带宽。我们需要一个轻量的 capabilities handshake，让服务端（以及生成 UI 的智能体）知道客户端“能渲染什么”，从源头减少不兼容输出，并提供可预测的降级策略。

## What Changes

- 定义一个客户端→服务端的 capabilities 上报机制（handshake）：
  - 报告已注册的 `componentType` 与支持的 `schemaVersion` 范围/集合
  - 报告关键协议/渲染能力（例如是否支持 `sharedState.ui.datasets`、是否支持 `Chart`/特定 mark）
- 在 server SDK 中提供 decode/validate 与选择/降级辅助：
  - 给定 `capabilities` 与候选 UI 输出，选择最兼容的组件类型/版本（或降级为兼容层组件）
- 在 framework adapters 中提供从 registry 生成 capabilities 的工具函数，并给出推荐的握手时机（连接建立/首次请求前）。

## Capabilities

### New Capabilities
- `ui-v1-capabilities`: 定义 capabilities handshake 的 payload schema 与语义（客户端上报什么、服务端如何使用）。

### Modified Capabilities
- `framework-adapters`: 增加“从 registry 生成 capabilities + 可选自动上报”的规范性要求。
- `server-sdk-python`: 增加 capabilities 的 decode/validate 与降级选择 helper 的规范性要求。
- `server-sdk-rust`: 同上。

## Impact

- `packages/rivu-react` / `packages/rivu-svelte`: 需要提供 registry→capabilities 的 helper，并在 demo 中展示一次握手（不强制绑定 Provider）。
- `python/` 与 `crates/`: 需要新增 capabilities schema、验证器与降级选择函数。
- 文档：补齐“客户端能力版本漂移”时的兼容策略（例如 `Chart` 不可用则退回 `BarChart/LineChart`）。
