## ADDED Requirements

### Requirement: Demo demonstrates DataTable/Chart sharing a dataset
React demo MUST 展示“同一份 dataset 被多个组件复用”的用法（至少：DataTable + Chart）。

#### Scenario: Demo mounts components that reference the same datasetId
- **WHEN** demo 加载初始 `STATE_SNAPSHOT`
- **THEN** 至少存在两个组件通过 `dataRef.datasetId` 引用同一个 `datasetId` 并成功渲染

