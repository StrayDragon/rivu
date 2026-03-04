## 1. Workspace & Tooling

- [x] 1.1 创建 monorepo 基础结构（TS packages / Rust crates / Python packages 分区）
- [x] 1.2 配置 pnpm workspace（ESM-first），并为 TS 包添加共享 tsconfig（TS 5.9）
- [x] 1.3 为 TS 包引入构建工具（tsup 或 rollup 二选一）与 `vitest` 测试框架
- [x] 1.4 初始化 Rust workspace（edition 2024）与基础 CI 级测试入口（`cargo test`）
- [x] 1.5 初始化 Python 包（3.12+，uv 管理）与基础测试入口（pytest 或 unittest 二选一）

## 2. `rivu-ui-spec`：Schema + Golden Vectors（Level 0）

- [x] 2.1 定义 `ui.v1.event` 的 TS 类型与 zod(v4) schema，并导出 runtime validator
- [x] 2.2 定义 `state.ui`（v1）的 TS 类型与 zod schema（components/mounts/revision/schemaVersion）
- [x] 2.3 生成并导出 JSON Schema（用于文档与跨语言对照）
- [x] 2.4 实现 Python（pydantic v2）模型：`UiV1Event`、`UiStateV1`，并提供 validate/parse API
- [x] 2.5 实现 Rust（serde）类型：`UiV1Event`、`UiStateV1`，并提供 validate API（包含 size/depth 的可配置限制）
- [x] 2.6 设计 golden vector 文件格式（valid/invalid + reduce 期望），并写入首批 vectors（覆盖 ui.v1.event + state.ui）
- [x] 2.7 为 TS/Python/Rust 分别添加 golden vectors 测试：decode/validate 结果一致
- [x] 2.8 为 TS/Python/Rust 分别添加 reduce 一致性测试（至少对 `lastSeq` 与 `state.ui` 的派生结果一致）

## 3. `rivu-kernel`：State / Reducer / Outbox（Level 1）

- [x] 3.1 定义 kernel 公共 API：`dispatch/getState/subscribe/send` 与 envelope `{seq,event}` 类型
- [x] 3.2 实现 `seq` 语义：顺序校验、去重、gap 检测与 resync 信号（不在 kernel 内拉取网络）
- [x] 3.3 集成 runtime 校验：AG-UI core 事件（使用官方 TS SDK）+ `ui.v1.event`（使用 `rivu-ui-spec`）
- [x] 3.4 实现 shared state reducer：`STATE_SNAPSHOT` 全量替换、`STATE_DELTA` 按 RFC6902 JSON Patch 应用
- [x] 3.5 实现 `state.ui` selectors（按 componentId 获取、按 mounts 获取 message-slot 排序组件）
- [x] 3.6 实现 outbox：`send(ui.v1.event)` 注入 transport、按 `clientRequestId` 去重、状态机（pending/acked/failed）
- [x] 3.7 添加关键单测：seq 去重/gap、JSON Patch 应用失败→resync、unknown custom name 默认拒绝、outbox 幂等去重

## 4. `rivu-react`：最薄接入面（Level 2）

- [x] 4.1 实现 `useKernelState`（基于 `useSyncExternalStore`）与 selector 订阅工具
- [x] 4.2 实现 registry 类型：`componentType -> {schemaVersion, propsSchema, stateSchema?, renderer}`
- [x] 4.3 实现 `ComponentRenderer`：从 `state.ui` 取数据→校验→渲染；失败时降级到 `UnknownComponentCard`
- [x] 4.4 提供可选 Provider（仅糖），但确保所有核心组件可通过 props 直接传入 kernel/registry 工作
- [x] 4.5 添加 React 侧测试：订阅更新、unknown 组件降级不炸页、校验失败降级

## 5. `rivu-svelte`：最薄接入面（Level 2）

- [x] 5.1 实现 Svelte `readable` store 适配（从 kernel subscribe 推送）
- [x] 5.2 实现与 `rivu-react` 对齐的 registry 与 renderer primitive（API 形状一致，语义一致）
- [x] 5.3 添加基础测试（至少覆盖订阅与 UnknownComponent 降级路径）

## 6. UI Components MVP（Viewer + Workflow）

- [x] 6.1 定义 Viewer P0 组件类型与 schemaVersion（`ReportSection/MetricCard/DataTable/BarChart/LineChart/CitationList`）
- [x] 6.2 实现 Viewer 组件（stateless）：仅依赖 props 渲染，禁止外部请求；对危险 URL/HTML 做净化/拦截点
- [x] 6.3 定义 Workflow P0 stateful 组件 schema：`ApprovalCard`（approve/deny）与 `FormCard`（setField/submit）
- [x] 6.4 实现 Workflow 组件：通过 kernel `send(ui.v1.event)` 上报交互，包含 `clientRequestId/baseRevision`
- [x] 6.5 实现 `UnknownComponentCard`（展示 componentType/schemaVersion 摘要，便于回放与排障）
- [x] 6.6 添加组件测试：props/state 校验、交互事件 payload 正确、失败降级路径覆盖

## 7. `rivu-server-sdk-python`：Store / Resume / Validate

- [x] 7.1 初始化 Python SDK 包结构（uv + pydantic v2），并对齐 `rivu-ui-spec` 的模型
- [x] 7.2 实现 `SeqAllocator`（按 thread 单调递增）与 SSE 编码工具（`id: seq` + `data:`）
- [x] 7.3 实现 `InMemoryRingBufferEventStore`（append + replayAfter + capacity/evict）
- [x] 7.4 实现 `SqliteSnapshotStore`（put/getLatest），支持从快照恢复 `state.ui`
- [x] 7.5 实现 `resume(replay)` 工具：优先 ring-buffer 补发，缺失则回退快照并从快照 seq 后继续
- [x] 7.6 实现 `UiV1EventProcessor` 辅助：鉴权钩子、幂等（clientRequestId）、并发（baseRevision vs revision）与输出 AG-UI `STATE_DELTA/STATE_SNAPSHOT`
- [x] 7.7 添加关键测试：幂等重试不重复写、revision 冲突拒绝、ring-buffer 缺失→快照回退、导出 JSON 快照可回放

## 8. `rivu-server-sdk-rust`：Store / Resume / Validate

- [x] 8.1 初始化 Rust crate（edition 2024：serde/serde_json/thiserror/uuid），并对齐 `rivu-ui-spec` 的类型
- [x] 8.2 实现 `SeqAllocator` 与 SSE 编码工具（`id: seq` + `data:`）
- [x] 8.3 实现 `InMemoryRingBufferEventStore`（append + replayAfter + capacity/evict）
- [x] 8.4 实现 `SqliteSnapshotStore`（rusqlite 优先），支持从快照恢复 `state.ui`
- [x] 8.5 实现 `resume(replay)` 工具：优先 ring-buffer，缺失回退快照
- [x] 8.6 实现 `UiV1EventProcessor` 辅助：幂等（clientRequestId）、并发（baseRevision vs revision）、输出 `STATE_DELTA/STATE_SNAPSHOT`
- [x] 8.7 添加关键测试：幂等/并发、快照回退、跨语言 vectors reduce 一致性（与 TS/Python 对齐）

## 9. Docs & Host Integration Guides（最薄接入面）

- [x] 9.1 编写集成指南：kernel 接入（Level 1/2 adoption ladder）、registry/ComponentRenderer 用法、UnknownComponent 策略
- [x] 9.2 编写 Zirvox 指南：从 WS delta/final/abort 到 AG-UI + `seq` wrapper 的最薄 adapter（仅示例代码，不落宿主仓库）
- [x] 9.3 编写 Crystalith 指南：从 SSE chunk/done/error 到 AG-UI SSE 的接入，替换 `[[crystalith-ui:v1]]` envelope 的迁移步骤
- [x] 9.4 编写导出/回顾指南：JSON 快照格式、如何用 `STATE_SNAPSHOT` 恢复 `state.ui`
