## ADDED Requirements

### Requirement: Rust SDK provides dataset patch helpers
Rust SDK MUST 提供 helpers 用于构建 datasets 相关的 JSON Patch（RFC 6902）操作（targeting `/ui/datasets/...`），至少覆盖：
- create/replace dataset
- delete dataset
- 校验 `dataRef.datasetId` 的基本合法性（non-empty）

#### Scenario: Build a dataset replace patch
- **WHEN** 服务需要写入/更新 `sharedState.ui.datasets[datasetId]`
- **THEN** 可以调用 SDK helper 生成 targeting `/ui/datasets/<datasetId>` 的 patch operations

