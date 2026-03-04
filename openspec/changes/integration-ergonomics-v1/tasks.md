## 1. 文档基线（低歧义）

- [ ] 1.1 新增 `docs/integration-quickstart.md`：统一定义 SSE/WS 的 `{seq,event}`、`resumeFrom`、以及从 `sharedState.ui` 渲染 mounts 的最小闭环
- [ ] 1.2 统一现有集成文档事件类型：默认示例使用 `TEXT_MESSAGE_CHUNK` / `TOOL_CALL_CHUNK`（并注明 `TEXT_MESSAGE_CONTENT` / `TOOL_CALL_ARGS` 兼容路径）
- [ ] 1.3 统一命名口径：文档中以 `sharedState.ui` 为准，并明确其与 PRD “`state.ui`” 的映射关系

## 2. Kernel & TS 集成辅助（可选、可 tree-shake）

- [ ] 2.1 梳理并修正文档/注释中对 `getState()` 返回值的表述（`sharedState` / `sharedState.ui`）
- [ ] 2.2 为常见 transport 提供纯函数级 adapter helpers（不做网络）：示例包含 SSE/WS → `{ seq, event }` → `kernel.dispatch(...)`
- [ ] 2.3 增补/回归测试：验证 gap/patch_error 下 `needsResync/resyncReason/gap` 元数据可被稳定观测（与 spec 对齐）

## 3. `ProtocolInspector`（开发态可观测）

- [ ] 3.1 在 `packages/rivu-react` 增加 `ProtocolInspector`（Provider-free 默认）：展示 `lastSeq/needsResync/resyncReason/gap/outbox` 与 `sharedState.ui` 摘要
- [ ] 3.2 在 `packages/rivu-svelte` 增加对应的 inspector primitive/store（同样 Provider-free 默认）
- [ ] 3.3 更新 `examples/rivu-react-demo`：加入 inspector toggle，并用其替换/补齐现有 DebugPanel（保持 demo 简洁）

## 4. Server SDK：`sharedState.ui` Patch Builder

- [ ] 4.1 Python：新增 `sharedState.ui` JSON Patch builder helpers（mount/unmount、set props/state、increment revision）+ 单测
- [ ] 4.2 Rust：新增 `sharedState.ui` JSON Patch builder helpers（mount/unmount、set props/state、increment revision）+ 单测
- [ ] 4.3 为 helpers 补充最小示例：从“生成组件 + mount”到“输出 `STATE_DELTA`”的完整片段

