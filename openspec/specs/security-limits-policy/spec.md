# security-limits-policy Specification

## Purpose
TBD - created by archiving change security-limits-policy-v1. Update Purpose after archive.
## Requirements
### Requirement: 统一的输入 limits 配置模型（v1）
系统 MUST 定义一套跨语言一致的 limits 配置模型（下称 `UiInputLimitsV1`），用于约束所有不可信 JSON 输入的可接受边界。

`UiInputLimitsV1` MUST 是 JSON 可序列化对象，并且 MUST 支持按域拆分（均为可选）：
- `decode`：通用 JSON decode 限制（例如 `maxBytes`、`maxDepth`、`maxStringLength`）
- `uiEvent`：`CUSTOM(name="ui.v1.event")` 专用限制（例如 `maxPayloadKeys`）
- `uiState`：`sharedState.ui` 结构规模限制（例如 `maxComponents`、`maxMountsTotal`、`maxDatasets`、`maxDatasetRows`）
- `jsonPatch`：JSON Patch（RFC 6902）限制（例如 `maxOps`、`maxPathLength`、`allowedPathPrefixes`）

#### Scenario: Limits 结构可被跨语言一致解析
- **WHEN** TS/Python/Rust 分别读取同一个 `UiInputLimitsV1` JSON
- **THEN** 三端能得到语义等价的 limits 配置（相同字段含义、相同默认行为）

### Requirement: SDK 提供 Viewer/Workflow 两类推荐默认 limits
官方 TS/Python/Rust SDK MUST 提供两套可直接使用的推荐默认 limits：
- `viewerDefaults`：面向只读回放与导出的 viewer profile
- `workflowDefaults`：面向交互回传与 server-authoritative 写入的 workflow profile

两套默认值 MUST 至少包含以下字段（数值单位均为“字节/层级/数量”）：

`viewerDefaults` MUST 至少为：
- `decode.maxBytes = 1048576`（1 MiB）
- `decode.maxDepth = 32`
- `decode.maxStringLength = 100000`
- `uiEvent.maxPayloadKeys = 32`
- `uiState.maxComponents = 500`
- `uiState.maxMountsTotal = 5000`
- `uiState.maxDatasets = 50`
- `uiState.maxDatasetRows = 10000`
- `uiState.maxDatasetColumns = 50`
- `jsonPatch.maxOps = 2000`
- `jsonPatch.maxPathLength = 256`
- `jsonPatch.allowedPathPrefixes = ["/ui"]`

`workflowDefaults` MUST 至少为：
- `decode.maxBytes = 262144`（256 KiB）
- `decode.maxDepth = 24`
- `decode.maxStringLength = 50000`
- `uiEvent.maxPayloadKeys = 16`
- `uiState.maxComponents = 200`
- `uiState.maxMountsTotal = 2000`
- `uiState.maxDatasets = 20`
- `uiState.maxDatasetRows = 2000`
- `uiState.maxDatasetColumns = 50`
- `jsonPatch.maxOps = 500`
- `jsonPatch.maxPathLength = 256`
- `jsonPatch.allowedPathPrefixes = ["/ui"]`

默认 limits MUST 可被宿主覆盖（支持局部覆盖某个域或某个字段）。

#### Scenario: 宿主可覆盖默认 limits 的单个字段
- **WHEN** 宿主在使用 `viewerDefaults` 的基础上仅覆盖 `jsonPatch.maxOps`
- **THEN** 系统执行时使用被覆盖后的 `maxOps`，其余字段保持默认值

#### Scenario: SDK 暴露的默认值满足规范要求
- **WHEN** 使用方从 SDK 读取 `viewerDefaults` 与 `workflowDefaults`
- **THEN** 两者至少包含本规范列出的字段与数值

### Requirement: 超限错误必须结构化且可诊断
当输入因 limits 被拒绝时，实现 MUST 返回/暴露结构化错误信息，至少包含：
- `code`: string，值为 `"LIMIT_EXCEEDED"`
- `limit`: non-empty string（例如 `"decode.maxBytes"`、`"jsonPatch.maxOps"`）
- `max`: number
- `observed`: number（如可计算；否则 MAY 省略）

实现 SHOULD 附带可选字段（用于诊断但不包含敏感数据）：
- `path`: string（例如 JSON Pointer 前缀或组件/数据集定位符）

#### Scenario: 超限错误包含 limit 与阈值
- **WHEN** 一个输入超过 `decode.maxBytes` 被拒绝
- **THEN** 错误包含 `code="LIMIT_EXCEEDED"`、`limit="decode.maxBytes"`、以及对应的 `max/observed`

