## MODIFIED Requirements

### Requirement: UI state is stored under `state.ui` (v1)
系统 MUST 将可渲染的 UI 组件数据存放在 AG-UI shared state 的顶层 key `ui` 下（即 `sharedState.ui`）。

`sharedState.ui` MUST 是一个对象，包含：
- `v`: integer equal to `1`
- `components`: an object map keyed by `componentId`

`sharedState.ui` MAY 额外包含：
- `datasets`: an object map keyed by `datasetId`（见 `ui-datasets` spec，用于表格/图表等组件的 `dataRef` 引用）

每个 `sharedState.ui.components[componentId]` 条目 MUST 包含：
- `type`: non-empty string (component type identifier)
- `schemaVersion`: positive integer
- `props`: JSON object
- `revision`: non-negative integer
- `mounts`: array of mount objects

每个 mount 对象 MUST 包含：
- `messageId`: non-empty string
- `slot`: non-empty string
- `order`: number

如果组件是 stateful，它 MUST 还包含：
- `state`: JSON object (server-authoritative persisted state)

如果组件是 stateless，则 `state` 字段 MAY 省略。

#### Scenario: `STATE_SNAPSHOT` can fully restore UI
- **WHEN** 收到一个 `STATE_SNAPSHOT`，其 `snapshot` 包含合法的 `ui` 对象（包含 `components`，并可选包含 `datasets`）
- **THEN** 使用方可以从 `sharedState.ui` 还原完整 UI（包含组件 mounts，以及组件所引用的数据集）
