## 1. Spec & Docs

- [ ] 1.1 定稿导出格式规范（HTML/SVG/PDF）与最小字段集合（基于 JSON snapshot）
- [ ] 1.2 新增 `docs/viewer-export.md`：从 snapshot 到 HTML/SVG/PDF 的推荐链路（含可选 Playwright）

## 2. Export implementation (TS-first)

- [ ] 2.1 新增导出模块（TS/Node）或在现有包中增加导出函数：`exportHtmlV1(snapshot) -> string`
- [ ] 2.2 为图表组件实现 SVG 导出路径（内联或资产输出），并与 HTML 导出集成
- [ ] 2.3 UnknownComponent 的导出降级块：包含 type/schemaVersion/props 摘要（不泄露敏感数据）

## 3. Demo

- [ ] 3.1 `examples/rivu-react-demo` 增加 ExportMenu：JSON/HTML/SVG 下载
- [ ] 3.2 手动验收：导出 HTML 独立打开可审阅；SVG 清晰；未知组件仍可导出

## 4. Optional PDF

- [ ] 4.1 文档化使用 Playwright/Chromium 从 HTML 生成 PDF 的方式
- [ ] 4.2 （可选）提供 `exportPdfV1(...)` helper（作为可选依赖，不强制安装）

