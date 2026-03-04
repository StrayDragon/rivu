## 1. Spec & Schema

- [ ] 1.1 定稿 `sharedState.ui.datasets` v1 schema（columns/rows + limits）与 `dataRef` 结构
- [ ] 1.2 在 `packages/rivu-ui-spec` 增加 datasets 与 dataRef 的 Zod schema + TS 类型导出
- [ ] 1.3 更新 `packages/rivu-ui-spec/scripts/generate-json-schema.ts` 输出 datasets/dataRef JSON schema
- [ ] 1.4 增加 golden vectors：valid/invalid datasets + dataRef 引用边界 case

## 2. Kernel & Adapters

- [ ] 2.1 `rivu-kernel` 增加 datasets 选择器/解析辅助（按 `datasetId` 取数据、校验缺失）
- [ ] 2.2 `rivu-react`：为 `DataTable`（以及 `Chart` 若已存在）增加 `dataRef` 解析与降级 UI
- [ ] 2.3 `rivu-svelte`：对齐同样的 dataRef 解析与降级策略

## 3. Server SDK helpers

- [ ] 3.1 Python：实现 datasets patch helpers（create/replace/delete）+ 单测
- [ ] 3.2 Rust：实现 datasets patch helpers（create/replace/delete）+ 单测

## 4. Demo & Docs

- [ ] 4.1 更新 `examples/rivu-react-demo`：新增 dataset，并让 DataTable/Chart 共享引用
- [ ] 4.2 新增 `docs/ui-datasets.md`：说明 datasets 的动机、limits、以及与回放/导出的关系

