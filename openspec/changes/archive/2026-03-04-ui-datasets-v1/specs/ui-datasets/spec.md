## ADDED Requirements

### Requirement: UI datasets exist under `sharedState.ui.datasets` (v1)
系统 MUST 在 `sharedState.ui` 下支持 `datasets` 字段：
- `sharedState.ui.datasets` MUST 是一个以 `datasetId` 为 key 的对象 map

datasets MUST 可被 `STATE_SNAPSHOT` / `STATE_DELTA` 回放恢复，并且属于 server-owned shared state。

#### Scenario: Snapshot restores datasets
- **WHEN** `STATE_SNAPSHOT` 的 `snapshot` 包含 `ui.datasets`
- **THEN** consumer 能从 `sharedState.ui.datasets` 还原数据集并供组件渲染引用

### Requirement: Dataset v1 uses columnar `columns + rows`
每个 dataset v1 MUST 至少包含：
- `columns: string[]`（non-empty）
- `rows: (string | number | null)[][]`

每个 `rows[i]` MUST 与 `columns` 等长（列数一致），以保证可预测的回放与导出。

实现 MUST 支持对 datasets 做 schema 校验，并允许配置 limits（例如 max bytes/max depth/max rows）。

#### Scenario: Reject dataset with empty columns
- **WHEN** 一个 dataset 的 `columns` 为空数组
- **THEN** 校验器拒绝该 dataset

#### Scenario: Reject dataset with row width mismatch
- **WHEN** 一个 dataset 的某一行 `rows[i].length != columns.length`
- **THEN** 校验器拒绝该 dataset

### Requirement: Components may reference datasets via `dataRef`
Viewer 组件（例如 `DataTable`、`Chart`）MUST 支持通过 `dataRef` 引用 datasets：
- `dataRef.datasetId` MUST 是 non-empty string

当组件使用 `dataRef` 时，渲染器 MUST 从 `sharedState.ui.datasets[dataRef.datasetId]` 解析数据。

#### Scenario: DataTable renders from a dataset reference
- **WHEN** `DataTable` props 使用 `dataRef.datasetId = "ds_1"` 且 `sharedState.ui.datasets.ds_1` 存在且合法
- **THEN** `DataTable` 从该 dataset 渲染其表格内容

### Requirement: Missing dataset references degrade gracefully
如果 `dataRef.datasetId` 缺失、为空、或引用的 dataset 不存在/非法，组件 MUST 进行 viewer-safe 降级展示，并且 MUST NOT crash 页面。

#### Scenario: Missing dataset shows viewer-safe fallback
- **WHEN** 一个组件引用了不存在的 `datasetId`
- **THEN** UI 展示可诊断的降级信息（例如“Dataset not found”）且页面保持可用
