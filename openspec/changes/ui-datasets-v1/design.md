## Context

`sharedState.ui` 目前主要承载 `components`（props/state + mounts）。随着 `Chart`、`DataTable`、`PivotTable` 等 Viewer 组件扩展，数据复用会越来越常见。

我们希望：
- 省 token：让 LLM 输出/服务端事件中避免重复数据拷贝
- 稳定回放：数据作为 shared state 的一部分随 `STATE_SNAPSHOT` 回放
- 易导出：导出时数据集与组件引用关系可被完整保留

## Goals / Non-Goals

**Goals:**
- 定义 `sharedState.ui.datasets` 的最小 v1 结构（列式数据为主）。
- 定义组件引用方式 `dataRef`（引用 datasetId），并规定缺失/非法引用的降级策略。
- 提供 server SDK 的 patch builder helpers，降低手写 JSON Patch 的错误率。
- 跨语言一致：TS/Python/Rust schema 与 vectors 对齐。

**Non-Goals:**
- v1 不引入复杂的数据变换 DSL（filter/groupby/aggregate）；这些属于后续能力（可由服务端预处理再写入 dataset）。
- v1 不做增量流式“追加行”协议（仍通过 `STATE_DELTA` patch 更新 datasets）。
- v1 不要求所有组件必须使用 datasets；内联数据仍可兼容（渐进采用）。

## Decisions

### 1) datasets 放在 `sharedState.ui` 下（而不是独立顶层）

**Decision:** `datasets` 作为 `sharedState.ui` 的一个字段（例如 `sharedState.ui.datasets`）。  
**Why:** UI 回放/导出天然围绕 `ui` 子树，放在同一子树更直觉，patch path 也更集中。  
**Alternatives:** 顶层 `sharedState.datasets` 会引入跨领域命名与访问成本。

### 2) v1 数据形状使用 `columns + rows`

**Decision:** dataset v1 默认形状使用 `columns: string[]` + `rows: (string|number|null)[][]`。  
**Why:** 与图表/表格 token-efficient 方向一致，且易做 schema 校验与导出。  
**Alternatives:** 对象数组（易读但 token 大）；二进制/压缩（需要额外解码与边界处理）。

### 3) 引用方式：`dataRef` 仅引用 datasetId（v1）

**Decision:** v1 的 `dataRef` 只包含 `datasetId`（以及可选的字段映射/列选择），不包含复杂 transform。  
**Why:** 保持协议与实现简单，把计算留在服务端；Viewer 回放以“最终数据”最稳。  
**Alternatives:** 在客户端做 transform 会引入不确定性与性能/安全风险。

### 4) 降级策略：UnknownDataset viewer-safe

**Decision:** 当 `dataRef` 指向缺失/非法 dataset 时，组件必须降级为 viewer-safe UI（类似 UnknownComponent）。  
**Why:** Viewer 场景要求“永不崩溃”，并能定位问题。  
**Alternatives:** 直接 throw 会破坏审阅/导出路径。

## Risks / Trade-offs

- [sharedState 体积] datasets 仍可能很大 → 通过 limits（rows/cols/bytes）约束，并建议服务端只写“LLM 可处理的规模”。
- [一致性] dataset 与组件引用可能失配 → server SDK helpers 应提供引用校验与一致性工具。
- [迁移成本] 现有组件内联数据 → 采用渐进策略：先支持引用，再逐步在 demo/示例中推广。

