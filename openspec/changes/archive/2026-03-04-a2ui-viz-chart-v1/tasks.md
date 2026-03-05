## 1. Spec & Schema

- [x] 1.1 定稿 `Chart` props v1（`mark + data(columns/rows) + encoding + options`）并补充最小/完整示例
- [x] 1.2 在 `packages/rivu-ui-spec` 增加 `Chart` props 的 Zod schema + TS 类型导出（供 A2UI 生成与校验）
- [x] 1.3 更新 `packages/rivu-ui-spec/scripts/generate-json-schema.ts` 输出新增的 `Chart` JSON schema（供外部系统/服务端使用）

## 2. React Viewer UI Kit（D3 渲染）

- [x] 2.1 在 `packages/rivu-react` 引入 D3（优先模块化依赖）并验证 Vite tree-shaking 产物体积可接受
- [x] 2.2 实现 `Chart` 组件（schemaVersion: 1）：bar/line/pie 的 SVG 渲染（轴/网格/tooltip/legend/响应式）
- [x] 2.3 引入 viewer-safe 错误边界与空数据占位态（参考 Tambo Graph 的 loading/错误范式）
- [x] 2.4 主题变量：增加 `--rivu-chart-*` 等 CSS variables（带 fallback），并在 `Chart` 渲染中使用
- [x] 2.5 将 `Chart` 注册到 `viewerRegistryV1`，并调整/补齐 `BarChart/LineChart` 的兼容策略（继续支持现有 demo 快照回放）

## 3. Demo & Docs

- [x] 3.1 更新 `examples/rivu-react-demo`：新增/替换 fixtures 挂载 `Chart`（同时覆盖兼容的 `BarChart/LineChart` 展示要求）
- [x] 3.2 更新 `docs/integration.md`：加入 `Chart` 组件说明、最小 props 示例、以及 token-efficient 生成建议（A2UI 视角）
- [x] 3.3 增补一份“给智能体的图表生成提示词片段”（可放 `docs/`），用于指导输出 `state.ui` 的 `Chart` 结构

## 4. Tests & Verification

- [x] 4.1 增加 `Chart` props schema 的单测（有效/无效/空数据）并覆盖 `UnknownComponent` 降级路径
- [x] 4.2 回归运行：`pnpm test` + `pnpm -C examples/rivu-react-demo dev`（手动验收：响应式、tooltip、legend、暗色主题覆盖）
