## Why

随着 Rivu 引入 A2UI、`sharedState.ui.datasets`、更丰富的 Viewer/Workflow 组件，前后端都会接收来自 LLM/用户/网络的不可信 JSON。仅靠 `max_bytes/max_depth` 还不足以防止 UI “爆炸”（大量组件/挂载/rows/patch ops）带来的 CPU/内存 DoS、以及 JSON Patch 越界写入等风险。我们需要一套跨 TS/Python/Rust 一致的 limits/policy，把“可以接受什么样的 UI/事件/patch”变成可配置、可观测、可测试的契约。

## What Changes

- 新增统一的安全与限额规范（limits/policy）：默认值建议 + 可配置项 + 错误语义（便于日志与调试），覆盖：
  - inbound `CUSTOM(name="ui.v1.event")`（payload 结构、大小、深度、字段约束）
  - inbound `STATE_SNAPSHOT/STATE_DELTA` 中的 `sharedState.ui`（components/mounts/datasets 的数量与大小）
  - inbound JSON Patch（ops 数量、path 长度、允许的 path 前缀/范围）
- 在 kernel 与 server SDK 中要求强制执行这些 limits；超限时 fail-fast，并返回可诊断错误；并提供可选降级策略（例如只拒绝 UI 相关输入，不影响文本消息流）。
- 提供跨语言一致性向量/测试：同一组“超限/未超限”输入在 TS/Python/Rust 上得出一致结论。

## Capabilities

### New Capabilities
- `security-limits-policy`: 定义 limits 配置项、默认值建议、错误语义与跨语言一致性要求。

### Modified Capabilities
- `ui-v1-event`: 扩展“输入不可信”的 limits 维度与错误语义，并把 `sharedState.ui`/patch 安全纳入规范性要求。
- `kernel-runtime`: 要求对 `STATE_DELTA` patch ops 做数量/路径限制，并暴露“超限/拒绝”的诊断元数据。
- `server-sdk-python`: 要求 SDK 在 decode/validate/compile 时接受统一的 limits 配置，并对超限返回结构化错误。
- `server-sdk-rust`: 同上。

## Impact

- `packages/rivu-kernel` / `packages/rivu-ui-spec`: 引入统一的 limits 配置与校验工具（含 patch 限制），并为 demo/测试补齐覆盖。
- `python/` 与 `crates/`: 扩展 decode limits（rows/components/ops 等）并对齐错误与向量。
- 文档与示例：补齐默认 limits（Viewer/Workflow profile）与调参建议。
