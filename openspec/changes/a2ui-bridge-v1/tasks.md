## 1. Spec & Vectors

- [ ] 1.1 定稿 `a2ui.v1` payload schema（ops 集合、字段、limits）并补充最小/完整示例
- [ ] 1.2 在 `packages/rivu-ui-spec` 增加 `a2ui.v1` Zod schema + TS 类型导出
- [ ] 1.3 更新 `packages/rivu-ui-spec/scripts/generate-json-schema.ts` 输出 `a2ui.v1` JSON schema
- [ ] 1.4 增加 golden vectors：valid/invalid A2UI + 选定输入的编译输出（patch ops）

## 2. Python SDK: decode + compile

- [ ] 2.1 增加 `a2ui.v1` 解码/校验（可配置 max bytes/max depth）
- [ ] 2.2 实现 A2UI 编译器：`a2ui.v1` → RFC6902 patch ops（目标 `/ui/...`），支持 `key -> componentId` 映射（按 `threadId` 维度持久化）
- [ ] 2.3 单测：对齐 vectors（valid/invalid + compile 输出语义），并覆盖 limits/边界 case
- [ ] 2.4 提供 `KeyMapStore`（或等价）抽象：按 `threadId` 存取 `key -> componentId`，并给出默认实现（内存 + 可选持久化适配示例）

## 3. Rust SDK: decode + compile

- [ ] 3.1 增加 `a2ui.v1` 解码/校验（可配置 max bytes/max depth）
- [ ] 3.2 实现 A2UI 编译器：`a2ui.v1` → RFC6902 patch ops（目标 `/ui/...`），支持 `key -> componentId` 映射（按 `threadId` 维度持久化）
- [ ] 3.3 单测：对齐 vectors（valid/invalid + compile 输出语义），并覆盖 limits/边界 case
- [ ] 3.4 提供 `KeyMapStore`（或等价）抽象：按 `threadId` 存取 `key -> componentId`，并给出默认实现（内存 + 可选持久化适配示例）

## 4. Docs

- [ ] 4.1 新增 `docs/a2ui-bridge.md`：解释 A2UI 与 AG-UI 分工、推荐链路（A2UI → compile → `STATE_DELTA/STATE_SNAPSHOT`）
- [ ] 4.2 补充最小示例：从 LLM 产出 `a2ui.v1` 到服务端编译再到前端渲染的闭环片段
