## 1. Limits 模型与一致性向量

- [ ] 1.1 在 `packages/rivu-ui-spec` 定义 `UiInputLimitsV1` schema（含 `decode/uiEvent/uiState/jsonPatch`；至少覆盖 `maxBytes/maxDepth/maxStringLength/maxPayloadKeys/maxComponents/maxMountsTotal/maxDatasets/maxDatasetRows/maxDatasetColumns/maxOps/maxPathLength/allowedPathPrefixes`）
- [ ] 1.2 增加 limits 相关 golden vectors（覆盖 `maxPayloadKeys/maxOps/maxComponents` 等边界）
- [ ] 1.3 在 TS/Python/Rust 测试中消费同一组 vectors 并断言一致接受/拒绝
- [ ] 1.4 在 `packages/rivu-ui-spec` 导出 `viewerDefaults/workflowDefaults`（数值按 spec 固定）并加单测

## 2. Kernel 防御性 limits

- [ ] 2.1 为 kernel 增加 `resyncReason="limit_exceeded"` 与结构化诊断字段（`limit/max/observed`）
- [ ] 2.2 在 `dispatch(STATE_DELTA)` 前强制校验 `jsonPatch.maxOps/allowedPathPrefixes`
- [ ] 2.3 在 `dispatch(STATE_SNAPSHOT)` 后强制校验 `uiState.maxComponents`（并在失败时拒绝应用）
- [ ] 2.4 为以上行为补齐单元测试（含“不推进 lastSeq、不应用 sharedState”断言）

## 3. Rust SDK 限额与 patch builder

- [ ] 3.1 在 Rust SDK 定义并解析 `UiInputLimitsV1`（与 `rivu-ui-spec` JSON schema 对齐）
- [ ] 3.2 扩展 `ui.v1.event` 解码：支持 `decode.maxStringLength` 与 `uiEvent.maxPayloadKeys`
- [ ] 3.3 提供 `jsonPatch` 校验/构建工具：支持 `maxOps/allowedPathPrefixes`
- [ ] 3.4 对齐 `LIMIT_EXCEEDED` 错误语义（`code/limit/max/observed`）
- [ ] 3.5 增加 SDK tests（覆盖超限拒绝与错误字段）

## 4. Python SDK 限额与 patch builder

- [ ] 4.1 在 Python SDK 定义 `UiInputLimitsV1`（TypedDict/dataclass）并与 JSON schema 对齐
- [ ] 4.2 扩展 `ui.v1.event` 解码：支持 `decode.maxStringLength` 与 `uiEvent.maxPayloadKeys`
- [ ] 4.3 提供 `jsonPatch` 校验/构建工具：支持 `maxOps/allowedPathPrefixes`
- [ ] 4.4 对齐 `LIMIT_EXCEEDED` 错误语义（`code/limit/max/observed`）
- [ ] 4.5 增加 SDK tests（覆盖超限拒绝与错误字段）

## 5. 文档与示例

- [ ] 5.1 文档补齐 Viewer/Workflow 默认 limits 与覆盖示例
- [ ] 5.2 `ProtocolInspector` 展示 `limit_exceeded` 的诊断信息（如已实现）
